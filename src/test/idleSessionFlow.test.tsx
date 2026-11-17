import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { IdleSession } from "@/components/auth/IdleSession";
import { idleKey, SIGN_OUT_KEY } from "@/lib/idleSession";

const mocks = vi.hoisted(() => ({ get: vi.fn(), logout: vi.fn(), membership: vi.fn(), roles: vi.fn() }));
vi.mock("@/lib/authSession", () => ({ getCurrentUser: mocks.get, signOutFromSession: mocks.logout }));
vi.mock("@/lib/tenantAdmin", () => ({ loadActiveMembership: mocks.membership, loadUserRoles: mocks.roles }));
const user = { id: "idle-user", email: "user@example.com" };
const start = 1_800_000_000_000;

function Probe() {
  const auth = useAuth();
  const location = useLocation();
  return <>
    <div data-testid="session">{auth.user?.id ?? "signed-out"}:{auth.companyId ?? "none"}:{auth.roles.join(",")}</div>
    <div data-testid="destination">{location.pathname}:{(location.state as { reason?: string } | null)?.reason}</div>
    {auth.logoutError && <p role="alert">{auth.logoutError}</p>}
    <button onClick={() => void auth.signOut().catch(() => undefined)}>Manual sign out</button>
    <button onClick={() => void auth.refreshSession().catch(() => undefined)}>Background session check</button>
  </>;
}
async function open(path = "/app/dashboard") {
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><IdleSession /><Routes>
    <Route path="*" element={<Probe />} />
  </Routes></AuthProvider></MemoryRouter>);
  await act(async () => {});
}
async function advance(ms: number) { await act(async () => { vi.advanceTimersByTime(ms); }); }
function storage(key: string, value: unknown) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value) }));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(start); localStorage.clear();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  mocks.get.mockReset().mockResolvedValue(user);
  mocks.logout.mockReset().mockResolvedValue(undefined);
  mocks.membership.mockReset().mockResolvedValue({ companyId: "company-a" });
  mocks.roles.mockReset().mockResolvedValue([{ role: "company_admin", companyId: "company-a" }]);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

describe("authenticated inactivity UI and session lifecycle", () => {
  it("warns at 58 minutes with countdown and signs out at 60 minutes, clearing membership", async () => {
    await open();
    await advance(58 * 60_000 - 1000);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await advance(1000);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("2:00");
    await advance(1000);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("1:59");
    await advance(119_000);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("session")).toHaveTextContent("signed-out:none:");
    expect(screen.getByTestId("destination")).toHaveTextContent("/auth/login:session_expired");
  });
  it("validates before Stay signed in resets the deadline", async () => {
    await open(); await advance(58 * 60_000);
    let resolve: ((value: typeof user) => void) | undefined;
    mocks.get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    expect(JSON.parse(localStorage.getItem(idleKey(user.id)) ?? "null").at).toBe(start);
    await act(async () => { resolve?.(user); });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(idleKey(user.id)) ?? "null").at).toBe(start + 58 * 60_000);
    await advance(2 * 60_000);
    expect(mocks.logout).not.toHaveBeenCalled();
  });
  it("failed continuation does not reset deadline", async () => {
    await open(); await advance(58 * 60_000);
    mocks.get.mockRejectedValueOnce(new Error("offline"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stay signed in" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("could not be verified");
    expect(JSON.parse(localStorage.getItem(idleKey(user.id)) ?? "null").at).toBe(start);
    await advance(120_000);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
  it("does not reset for focus, polling, synthetic events or automatic modal focus", async () => {
    await open(); await advance(30 * 60_000);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      fireEvent.click(screen.getByRole("button", { name: "Background session check" }));
      fireEvent.mouseMove(document); fireEvent.keyDown(document, { key: "a" });
    });
    await advance(28 * 60_000);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("2:00");
  });
  it("expires immediately on visibility return after browser sleep", async () => {
    await open();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    vi.setSystemTime(start + 61 * 60_000);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("destination")).toHaveTextContent("session_expired");
  });
  it("synchronizes another tab's genuine activity and expiration", async () => {
    await open(); await advance(30 * 60_000);
    await act(async () => { storage(idleKey(user.id), { at: Date.now(), status: "active" }); });
    await advance(28 * 60_000);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await act(async () => { storage(idleKey(user.id), { at: Date.now(), status: "expired" }); });
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("destination")).toHaveTextContent("session_expired");
  });
  it("synchronizes explicit signout across tabs and cannot be restored by focus", async () => {
    await open();
    await act(async () => { storage(SIGN_OUT_KEY, { at: Date.now(), status: "signed_out" }); });
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("destination")).toHaveTextContent("/auth/login:signed_out");
    const calls = mocks.get.mock.calls.length;
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(mocks.get).toHaveBeenCalledTimes(calls);
    expect(screen.getByTestId("session")).toHaveTextContent("signed-out:none:");
  });
  it("manual logout publishes status only, clears local access and calls existing logout", async () => {
    await open();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Manual sign out" })); });
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(SIGN_OUT_KEY) ?? "null")).toEqual({ at: start, status: "signed_out" });
    expect(screen.getByTestId("destination")).toHaveTextContent("/auth/login:signed_out");
  });
  it("reports unconfirmed server logout without restoring local access", async () => {
    mocks.logout.mockRejectedValueOnce(new Error("offline"));
    await open(); await advance(60 * 60_000);
    expect(screen.getByRole("alert")).toHaveTextContent("server sign-out could not be confirmed");
    expect(screen.getByTestId("session")).toHaveTextContent("signed-out:none:");
  });
  it.each(["/", "/auth/login", "/auth/signup", "/auth/confirm", "/auth/accept-invite"])("never starts timeout on %s", async (path) => {
    await open(path); await advance(61 * 60_000);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(localStorage.getItem(idleKey(user.id))).toBeNull();
  });
});