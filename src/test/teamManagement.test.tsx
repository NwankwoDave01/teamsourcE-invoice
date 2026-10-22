import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Team from "@/pages/tenant/Team";
import { parseTeam, tenantRoles } from "@/lib/tenantAdmin";
import { useInviteTeamMember } from "@/hooks/useCompanyData";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), roles: ["company_admin"], refreshMembership: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-a" }, companyId: "company-a", roles: mocks.roles, isSuperAdmin: false, refreshMembership: mocks.refreshMembership }) }));
const member = { id: "member-a", user_id: "user-a", status: "Active", last_active_at: null, created_at: "2026-10-01", email: "member@example.test", display_name: "Member A", role: "staff_user" };
const invitation = { id: "invite-a", email: "invitee@example.test", role: "finance_officer", status: "pending", created_at: "2026-10-20", expires_at: "2026-10-28" };
let client: QueryClient;
function openTeam() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><Team /></QueryClientProvider>);
}
beforeEach(() => {
  mocks.roles = ["company_admin"];
  mocks.invoke.mockReset();
  mocks.refreshMembership.mockReset();
  mocks.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "list" ? { ok: true, members: [member], invitations: [invitation] } : { ok: true }, error: null }));
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); client?.clear(); });
describe("tenant team management", () => {
  it("uses the authenticated company for list and invitation", async () => {
    openTeam();
    await screen.findByText("member@example.test");
    expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "list", company_id: "company-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Invite member" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.test" } });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New teammate" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "invite", company_id: "company-a", email: "new@example.test", display_name: "New teammate", role: "staff_user" } }));
    await waitFor(() => expect(mocks.invoke.mock.calls.filter(([, { body }]) => body.action === "list")).toHaveLength(2));
  });
  it("does not list or expose team mutations to staff", () => {
    mocks.roles = ["staff_user"]; openTeam();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Invite member" })).not.toBeInTheDocument();
  });
  it("offers exactly the three supported tenant roles, never super_admin", () => {
    expect([...tenantRoles]).toEqual(["company_admin", "finance_officer", "staff_user"]);
  });
  it("changes an existing member role through set_role with the active company", async () => {
    openTeam(); await screen.findByText("member@example.test");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Role for member@example.test" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Finance Officer" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "set_role", company_id: "company-a", user_id: "user-a", role: "finance_officer" } }));
  });
  it("requires confirmation for member removal", async () => {
    openTeam(); await screen.findByText("member@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(mocks.invoke.mock.calls.some(([, { body }]) => body.action === "remove_member")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "remove_member", company_id: "company-a", user_id: "user-a" } }));
  });
  it("revokes a pending invitation only after confirmation", async () => {
    openTeam(); await screen.findByText("invitee@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));
    expect(mocks.invoke.mock.calls.some(([, { body }]) => body.action === "revoke_invitation")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirm revocation" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "revoke_invitation", company_id: "company-a", invitation_id: "invite-a" } }));
  });
  it("shows unconfirmed invite failures without closing the form", async () => {
    mocks.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "list" ? { ok: true, members: [member], invitations: [] } : { ok: false, error: "Invitation denied" }, error: null }));
    openTeam(); await screen.findByText("member@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Invite member" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(screen.getAllByRole("alert").some((el) => el.textContent === "Invitation denied")).toBe(true));
    expect(screen.getByLabelText("Email")).toHaveValue("new@example.test");
  });
  it("rejects an incomplete list instead of showing an empty successful team", () => {
    expect(() => parseTeam({ ok: true, members: [] })).toThrow();
  });
  it("uses only allowed invite fields and the authenticated company", async () => {
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useInviteTeamMember(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    const input = { email: "new@example.test", display_name: "New", role: "staff_user" as const, company_id: "other-company", user_id: "other-user" };
    await act(async () => { await result.current.mutateAsync(input); });
    expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "invite", company_id: "company-a", email: "new@example.test", display_name: "New", role: "staff_user" } });
  });
  it.each(["set_role", "remove_member", "revoke_invitation"])("shows %s failures without treating the change as successful", async (action) => {
    mocks.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "list" ? { ok: true, members: [member], invitations: [invitation] } : { ok: false, error: "Change denied" }, error: null }));
    openTeam(); await screen.findByText("member@example.test");
    if (action === "set_role") {
      fireEvent.keyDown(screen.getByRole("combobox", { name: "Role for member@example.test" }), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("option", { name: "Finance Officer" }));
    } else {
      fireEvent.click(screen.getByRole("button", { name: action === "remove_member" ? "Remove" : "Revoke invitation" }));
      fireEvent.click(screen.getByRole("button", { name: action === "remove_member" ? "Confirm removal" : "Confirm revocation" }));
    }
    await waitFor(() => expect(screen.getAllByRole("alert").some((el) => el.textContent === "Change denied")).toBe(true));
    expect(mocks.invoke.mock.calls.filter(([, { body }]) => body.action === "list")).toHaveLength(1);
  });
});