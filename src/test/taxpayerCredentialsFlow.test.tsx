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
    await screen.findByText("Not established by this contract");
    expect(screen.getByRole("button", { name: "Save API credentials" })).toBeDisabled();
    expect(screen.getByLabelText("Taxpayer API key")).toBeDisabled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it("does not expose secret inputs or disconnect to staff", async () => {
    mocks.roles = ["staff_user"];
    openSettings();
    await screen.findByText("Not established by this contract");
    expect(screen.queryByLabelText("Taxpayer API key")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disconnect taxpayer credentials" })).not.toBeInTheDocument();
  });
  it("keeps unsupported crypto unavailable without calling save_crypto or verify", async () => {
    openSettings();
    await screen.findByText("Public key / certificate configuration unavailable");
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).toHaveBeenCalledWith("nrs-credentials", { body: { action: "status" } });
    expect(screen.queryByRole("textbox", { name: /certificate/i })).not.toBeInTheDocument();
  });
  it("shows service errors without claiming saved status or exposing response error details", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: "test-private-provider-detail" } });
    openSettings();
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Save API credentials" })).toBeDisabled();
    expect(screen.queryByText(/test-private-provider-detail/)).not.toBeInTheDocument();
  });
});