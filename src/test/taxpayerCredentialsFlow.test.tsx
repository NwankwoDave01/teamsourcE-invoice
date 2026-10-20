import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaxpayerCredentials } from "@/components/nrs/TaxpayerCredentials";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), roles: ["company_admin"], companyId: "company-a" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-a" }, companyId: mocks.companyId, roles: mocks.roles }) }));

const status = { environment: "sandbox", api_key_configured: false, api_secret_configured: false, taxpayer_password_configured: false, verified: false, verified_at: null, last_error: null };
let client: QueryClient;

function openSettings(environmentUnsaved = false) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><TaxpayerCredentials companyName="Test company" environment="sandbox" environmentUnsaved={environmentUnsaved} /></QueryClientProvider>);
}

beforeEach(() => {
  mocks.roles = ["company_admin"];
  mocks.companyId = "company-a";
  mocks.invoke.mockReset();
  mocks.invoke.mockImplementation(async (_name, options) => ({ data: { ...status, api_key_configured: options.body.action !== "status", api_secret_configured: options.body.action !== "status" }, error: null }));
});
afterEach(() => { cleanup(); client?.clear(); vi.restoreAllMocks(); });

describe("write-only taxpayer settings flow", () => {
  it("saves only through the function, clears entries and never stores secrets on the device", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem");
    openSettings();
    const key = await screen.findByLabelText("Taxpayer API key");
    await waitFor(() => expect(key).toBeEnabled());
    fireEvent.change(key, { target: { value: "test-tenant-key" } });
    fireEvent.change(screen.getByLabelText("Taxpayer API secret"), { target: { value: "test-tenant-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save API credentials" }));
    await screen.findByText("API credentials saved. Saving does not verify SI readiness or connect the APP.");
    expect(mocks.invoke).toHaveBeenCalledWith("nrs-credentials", { body: { action: "save", api_key: "test-tenant-key", api_secret: "test-tenant-secret" } });
    expect(key).toHaveValue("");
    expect(screen.getByLabelText("Taxpayer API secret")).toHaveValue("");
    expect(storage).not.toHaveBeenCalled();
    expect(JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data))).not.toContain("test-tenant-secret");
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
    expect(mocks.invoke.mock.calls.every(([, options]) => ["status", "save"].includes(options.body.action))).toBe(true);
  });
  it("blocks saving against an unsaved environment selection", async () => {
    openSettings(true);
    await screen.findByText("Not established");
    expect(screen.getByRole("button", { name: "Save API credentials" })).toBeDisabled();
    expect(screen.getByLabelText("Taxpayer API key")).toBeDisabled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it("does not expose secret inputs or disconnect to staff", async () => {
    mocks.roles = ["staff_user"];
    openSettings();
    await screen.findByText("Not established");
    expect(screen.queryByLabelText("Taxpayer API key")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disconnect taxpayer credentials" })).not.toBeInTheDocument();
  });
  it("keeps crypto setup write-only and calls save_crypto only when the button is clicked", async () => {
    openSettings();
    const publicKey = await screen.findByLabelText("Public key (PEM / Base64 PEM)");
    const certificate = screen.getByLabelText("NRS certificate value");
    await waitFor(() => expect(publicKey).toBeEnabled());
    expect(publicKey).toHaveAttribute("type", "password");
    expect(certificate).toHaveAttribute("type", "password");
    expect(screen.queryByText(/certificate id/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check saved crypto format" })).toBeDisabled();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).toHaveBeenCalledWith("nrs-credentials", { body: { action: "status" } });
    fireEvent.change(publicKey, { target: { value: "test-public-key" } });
    fireEvent.change(certificate, { target: { value: "test-certificate" } });
    fireEvent.click(screen.getByRole("button", { name: "Save crypto values" }));
    await screen.findByText("Crypto save request completed. Review refreshed metadata; saving is not NRS verification.");
    expect(mocks.invoke).toHaveBeenCalledWith("nrs-credentials", { body: { action: "save_crypto", public_key: "test-public-key", certificate: "test-certificate" } });
    expect(publicKey).toHaveValue("");
    expect(certificate).toHaveValue("");
    expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
  });
  it("shows service errors without claiming saved status or exposing response error details", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: "test-private-provider-detail" } });
    openSettings();
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Save API credentials" })).toBeDisabled();
    expect(screen.queryByText(/test-private-provider-detail/)).not.toBeInTheDocument();
  });
  it("clears secret entries after a failed save without reporting success", async () => {
    mocks.invoke.mockImplementation(async (_name, options) => options.body.action === "save"
      ? { data: null, error: { message: "test-private-error" } }
      : { data: status, error: null });
    openSettings();
    const key = await screen.findByLabelText("Taxpayer API key");
    await waitFor(() => expect(key).toBeEnabled());
    fireEvent.change(key, { target: { value: "test-key" } });
    fireEvent.change(screen.getByLabelText("Taxpayer API secret"), { target: { value: "test-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save API credentials" }));
    await screen.findByRole("alert");
    expect(key).toHaveValue("");
    expect(screen.getByLabelText("Taxpayer API secret")).toHaveValue("");
    expect(screen.queryByText(/API credentials saved\./)).not.toBeInTheDocument();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
  });
  it("requires confirmation to disconnect using only authenticated server scope", async () => {
    let connected = true;
    mocks.invoke.mockImplementation(async (_name, options) => {
      if (options.body.action === "disconnect") connected = false;
      return { data: { ...status, api_key_configured: connected, api_secret_configured: connected }, error: null };
    });
    openSettings();
    const button = await screen.findByRole("button", { name: "Disconnect taxpayer credentials" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await screen.findByRole("alertdialog");
    expect(mocks.invoke.mock.calls.some(([, options]) => options.body.action === "disconnect")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /^Disconnect$/ }));
    await screen.findByText("Taxpayer credentials disconnected. Company identifiers and APP onboarding are unchanged.");
    expect(mocks.invoke).toHaveBeenCalledWith("nrs-credentials", { body: { action: "disconnect" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Disconnect taxpayer credentials" })).toBeDisabled());
  });
});