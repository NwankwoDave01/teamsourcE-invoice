import { cleanup, render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AcceptInvitation from "@/pages/auth/AcceptInvitation";
import Signup from "@/pages/auth/Signup";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  getCurrentUser: vi.fn(),
  signOutFromSession: vi.fn(),
  updateAccountPassword: vi.fn(),
  verifyInvitation: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

vi.mock("@/lib/authSession", () => ({
  getCurrentUser: mocks.getCurrentUser,
  signOutFromSession: mocks.signOutFromSession,
  updateAccountPassword: mocks.updateAccountPassword,
  verifyInvitation: mocks.verifyInvitation,
}));

vi.mock("@/components/auth/TurnstileCaptcha", () => ({
  TurnstileCaptcha: ({ onTokenChange }: { onTokenChange: (token: string | null) => void }) => (
    <button type="button" onClick={() => onTokenChange("signup-test-token")}>Complete CAPTCHA</button>
  ),
}));

let filters: [string, unknown][];
let activeMember: { company_id: string } | null;
const user = { id: "user-a", email: "user@example.com" };

function Probe() {
  const auth = useAuth();
  return (
    <>
      <div>{auth.loading ? "loading" : `${auth.companyId ?? "no-company"}:${auth.roles.join(",")}`}</div>
      <button onClick={() => void auth.signOut()}>Sign out probe</button>
    </>
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/auth/login");
  filters = [];
  activeMember = { company_id: "company-a" };
  mocks.invoke.mockReset().mockResolvedValue({
    data: { ok: true, company_name: "Acme Nigeria", role: "finance_officer", email: "user@example.com" },
    error: null,
  });
  mocks.getCurrentUser.mockReset().mockResolvedValue(null);
  mocks.signOutFromSession.mockReset().mockResolvedValue(undefined);
  mocks.updateAccountPassword.mockReset().mockResolvedValue(user);
  mocks.verifyInvitation.mockReset().mockImplementation(async () => {
    mocks.getCurrentUser.mockResolvedValue(user);
    return user;
  });

  mocks.from.mockReset().mockImplementation((table) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((key, value) => {
        if (table === "company_members") filters.push([key, value]);
        return query;
      }),
      maybeSingle: vi.fn(async () => ({ data: activeMember, error: null })),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [{ role: "company_admin", company_id: "company-a" }],
          error: null,
        }).then(resolve),
    };
    return query;
  });
});

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });

describe("Authentication & Invitation Flow Safeguards", () => {
  describe("AuthProvider normal sign-in", () => {
    it("accepts once before reading Active membership during normal session load", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("company-a:company_admin");
      expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
      expect(mocks.invoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.from.mock.invocationCallOrder[0]);
      // Must only query Active company_members
      expect(filters).toContainEqual(["user_id", "user-a"]);
      expect(filters).toContainEqual(["status", "Active"]);
    });

    it("does not repeat membership work when a verified session is checked again", async () => {
      mocks.getCurrentUser.mockResolvedValue(user);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("company-a:company_admin");
      const initialFromCalls = mocks.from.mock.calls.length;
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      await waitFor(() => expect(mocks.getCurrentUser).toHaveBeenCalledTimes(2));
      expect(mocks.from.mock.calls.length).toBe(initialFromCalls);
      expect(mocks.invoke).toHaveBeenCalledTimes(1);
    });

    it("fails safely on no pending invite and still requires Active membership", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      mocks.invoke.mockResolvedValueOnce({ data: { ok: true, accepted: false }, error: null });
      activeMember = null;
      render(<AuthProvider><Probe /></AuthProvider>);
      await screen.findByText("no-company:");
      expect(filters).toContainEqual(["status", "Active"]);
    });

    it("does not auto-accept on the explicit invitation setup page", async () => {
      window.history.replaceState({}, "", "/auth/accept-invite");
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMember = null;
      render(<AuthProvider><Probe /></AuthProvider>);
      await screen.findByText("no-company:");
      expect(mocks.invoke).not.toHaveBeenCalled();
      expect(mocks.from).not.toHaveBeenCalled();
    });

    it("ignores an acceptance response after sign-out", async () => {
      let finish: ((value: unknown) => void) | undefined;
      mocks.invoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      render(<AuthProvider><Probe /></AuthProvider>);
      await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole("button", { name: "Sign out probe" }));
      await waitFor(() => expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1));
      await act(async () => { finish?.({ data: { ok: true }, error: null }); });
      await screen.findByText("no-company:");
      expect(mocks.from).not.toHaveBeenCalled();
    });

    it("leaves companyId as null when user has no active membership", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMember = null;
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("no-company:");
      expect(filters).toContainEqual(["status", "Active"]);
    });
  });

  describe("AcceptInvitation page token_hash protection against email security scanners", () => {
    beforeEach(() => {
      window.history.replaceState({}, "", "/auth/accept-invite");
    });

    it("never verifies token_hash automatically on page load", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=scanner-safe-token&type=invite"]}>
          <AuthProvider>
            <AcceptInvitation />
          </AuthProvider>
        </MemoryRouter>
      );

      // Displays the confirmation card with manual button
      await screen.findByText("Workspace invitation");
      expect(screen.getByRole("button", { name: /Continue to accept invitation/i })).toBeInTheDocument();

      // Invitation verification must not run automatically on page load.
      expect(mocks.verifyInvitation).not.toHaveBeenCalled();
    });

    it("calls verifyOtp only when Continue to accept invitation is clicked, and never twice", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=scanner-safe-token&type=invite"]}>
          <AuthProvider>
            <AcceptInvitation />
          </AuthProvider>
        </MemoryRouter>
      );

      const continueBtn = await screen.findByRole("button", { name: /Continue to accept invitation/i });
      expect(mocks.verifyInvitation).not.toHaveBeenCalled();

      // User explicitly clicks
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(mocks.verifyInvitation).toHaveBeenCalledWith("scanner-safe-token");
      });

      // Attempt second click; must not verify twice
      fireEvent.click(continueBtn);
      expect(mocks.verifyInvitation).toHaveBeenCalledTimes(1);

      // After verification, loads invitation status and displays company and role
      await screen.findByText("Set up your account");
      expect(screen.getByText("Acme Nigeria")).toBeInTheDocument();
      expect(screen.getByText("Finance Officer")).toBeInTheDocument();
    });

    it("handles verifyOtp errors gracefully without crashing or submitting password", async () => {
      mocks.verifyInvitation.mockRejectedValueOnce(new Error("Token has expired or is invalid"));

      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=expired-token&type=invite"]}>
          <AuthProvider>
            <AcceptInvitation />
          </AuthProvider>
        </MemoryRouter>
      );

      const continueBtn = await screen.findByRole("button", { name: /Continue to accept invitation/i });
      fireEvent.click(continueBtn);

      await screen.findByText("Token has expired or is invalid");
      expect(mocks.updateAccountPassword).not.toHaveBeenCalled();
      expect(mocks.invoke).not.toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
    });

    it("completes full acceptance: verifies token, sets password, calls accept_invitation, and verifies active membership", async () => {
      mocks.getCurrentUser.mockResolvedValue(user);
      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=valid-token&type=invite"]}>
          <AuthProvider>
            <Routes>
              <Route path="/auth/accept-invite" element={<AcceptInvitation />} />
              <Route path="/app/dashboard" element={<div>Company Workspace Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // 1. Click Continue
      const continueBtn = await screen.findByRole("button", { name: /Continue to accept invitation/i });
      fireEvent.click(continueBtn);

      // 2. Set password
      await screen.findByText("Set up your account");
      fireEvent.change(screen.getByLabelText("Set password"), { target: { value: "SecretPass123!" } });
      fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "SecretPass123!" } });

      // 3. Submit acceptance
      fireEvent.click(screen.getByRole("button", { name: /Set password & accept invitation/i }));

      await waitFor(() => {
        expect(mocks.updateAccountPassword).toHaveBeenCalledWith("SecretPass123!");
        expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
      });

      // 4. Verifies active membership and enters dashboard
      await screen.findByText("Company Workspace Dashboard");
    });

    it("rejects an 11-character invitation password", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=valid-token&type=invite"]}>
          <AuthProvider>
            <AcceptInvitation />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole("button", { name: /Continue to accept invitation/i }));
      await screen.findByText("Set up your account");
      fireEvent.change(screen.getByLabelText("Set password"), { target: { value: "12345678901" } });
      fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "12345678901" } });
      fireEvent.click(screen.getByRole("button", { name: /Set password & accept invitation/i }));

      await screen.findByText("Password must be at least 12 characters long.");
      expect(mocks.updateAccountPassword).not.toHaveBeenCalled();
      expect(mocks.invoke).not.toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
    });

    it("accepts a matching 12-character invitation password", async () => {
      mocks.getCurrentUser.mockResolvedValue(user);
      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=valid-token&type=invite"]}>
          <AuthProvider>
            <Routes>
              <Route path="/auth/accept-invite" element={<AcceptInvitation />} />
              <Route path="/app/dashboard" element={<div>Company Workspace Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole("button", { name: /Continue to accept invitation/i }));
      await screen.findByText("Set up your account");
      fireEvent.change(screen.getByLabelText("Set password"), { target: { value: "123456789012" } });
      fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "123456789012" } });
      fireEvent.click(screen.getByRole("button", { name: /Set password & accept invitation/i }));

      await screen.findByText("Company Workspace Dashboard");
      expect(mocks.updateAccountPassword).toHaveBeenCalledWith("123456789012");
      expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
    });

    it("still requires confirmation to match a valid-length password", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/accept-invite?token_hash=valid-token&type=invite"]}>
          <AuthProvider>
            <AcceptInvitation />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole("button", { name: /Continue to accept invitation/i }));
      await screen.findByText("Set up your account");
      fireEvent.change(screen.getByLabelText("Set password"), { target: { value: "123456789012" } });
      fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "123456789013" } });
      fireEvent.click(screen.getByRole("button", { name: /Set password & accept invitation/i }));

      await screen.findByText("Passwords do not match.");
      expect(mocks.updateAccountPassword).not.toHaveBeenCalled();
    });
  });

  describe("ProtectedRoute safeguards", () => {
    it("blocks tenant routes for users without active company access and avoids redirect loop", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMember = null; // No active company
      render(
        <MemoryRouter initialEntries={["/app/invoices"]}>
          <AuthProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/app/invoices" element={<div>Tenant Content</div>} />
              </Route>
              <Route path="/auth/login" element={<div>Login Page</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should redirect to login, NOT render tenant content
      await screen.findByText("Login Page");
      expect(screen.queryByText("Tenant Content")).not.toBeInTheDocument();
    });

    it("allows tenant access when active company membership is present", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMember = { company_id: "company-a" };
      render(
        <MemoryRouter initialEntries={["/app/invoices"]}>
          <AuthProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/app/invoices" element={<div>Tenant Content</div>} />
              </Route>
              <Route path="/auth/login" element={<div>Login Page</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByText("Tenant Content");
    });
  });

  describe("Invitation-only signup", () => {
    it("does not submit public signup or create a workspace", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/signup"]}>
          <Signup />
        </MemoryRouter>
      );

      expect(await screen.findByText("Workspace access is invitation-only")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Create workspace" })).not.toBeInTheDocument();
    });
  });
});