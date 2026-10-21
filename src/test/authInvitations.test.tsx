import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), callback: null as null | ((event: string, session: unknown) => void), getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mocks.invoke }, from: mocks.from,
  auth: { getSession: mocks.getSession, onAuthStateChange: (cb: typeof mocks.callback) => { mocks.callback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; }, signOut: vi.fn() },
} }));
const session = { user: { id: "user-a" } };
let filters: [string, unknown][];
let activeMember: { company_id: string } | null;
function Probe() { const auth = useAuth(); return <div>{auth.loading ? "loading" : `${auth.companyId ?? "no-company"}:${auth.roles.join(",")}`}</div>; }
beforeEach(() => {
  filters = []; activeMember = { company_id: "company-a" };
  mocks.invoke.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  mocks.getSession.mockReset().mockResolvedValue({ data: { session } });
  mocks.from.mockReset().mockImplementation((table) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((key, value) => { if (table === "company_members") filters.push([key, value]); return query; }),
      maybeSingle: vi.fn(async () => ({ data: activeMember, error: null })),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ role: "company_admin", company_id: "company-a" }, { role: "finance_officer", company_id: "other-company" }], error: null }).then(resolve),
    }; return query;
  });
});
afterEach(cleanup);
describe("invitation acceptance and active access", () => {
  it("accepts before reading membership and only reads Active rows", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("company-a:company_admin");
    expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
    expect(filters).toContainEqual(["user_id", "user-a"]);
    expect(filters).toContainEqual(["status", "Active"]);
    expect(mocks.invoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.from.mock.invocationCallOrder[0]);
  });
  it("does not reaccept on duplicate session events or token refresh", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("company-a:company_admin");
    act(() => { mocks.callback?.("INITIAL_SESSION", session); mocks.callback?.("TOKEN_REFRESHED", session); });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it("failed acceptance never grants access to pending or disabled membership", async () => {
    activeMember = null;
    mocks.invoke.mockResolvedValue({ data: { ok: false, error: "No pending invitation" }, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("no-company:");
    expect(filters).toContainEqual(["status", "Active"]);
  });
  it("ignores an acceptance result after sign-out", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.invoke.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    act(() => mocks.callback?.("SIGNED_OUT", null));
    await screen.findByText("no-company:");
    await act(async () => resolve?.({ data: { ok: true }, error: null }));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(screen.getByText("no-company:")).toBeInTheDocument();
  });
});