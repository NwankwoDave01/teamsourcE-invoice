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
  callback: null as null | ((event: string, session: unknown) => void),
  getSession: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signUp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: (cb: typeof mocks.callback) => {
        mocks.callback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      updateUser: mocks.updateUser,
      signUp: mocks.signUp,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      verifyOtp: mocks.verifyOtp,
      signOut: vi.fn(),
    },
  },
}));

let filters: [string, unknown][];
let activeMember: { company_id: string } | null;
const session = { user: { id: "user-a", email: "user@example.com" } };

function Probe() {
  const auth = useAuth();
  return <div>{auth.loading ? "loading" : `${auth.companyId ?? "no-company"}:${auth.roles.join(",")}`}</div>;
}

beforeEach(() => {
  filters = [];
  activeMember = { company_id: "company-a" };
  mocks.invoke.mockReset().mockResolvedValue({
    data: { ok: true, company_name: "Acme Nigeria", role: "finance_officer", email: "user@example.com" },
    error: null,
  });
  mocks.getSession.mockReset().mockResolvedValue({ data: { session: null } });
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: session.user }, error: null });
  mocks.updateUser.mockReset().mockResolvedValue({ data: { user: session.user }, error: null });
  mocks.signUp.mockReset().mockResolvedValue({ data: { user: session.user, session: null }, error: null });
  mocks.exchangeCodeForSession.mockReset().mockResolvedValue({ data: { session }, error: null });
  mocks.verifyOtp.mockReset().mockResolvedValue({ data: { session, user: session.user }, error: null });

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

afterEach(cleanup);

describe("Authentication & Invitation Flow Safeguards", () => {
  describe("AuthProvider normal sign-in", () => {
    it("does NOT automatically invoke accept_invitation during normal session load", async () => {
      mocks.getSession.mockResolvedValueOnce({ data: { session } });
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("company-a:company_admin");
      // Must NOT invoke accept_invitation automatically
      expect(mocks.invoke).not.toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
      // Must only query Active company_members
      expect(filters).toContainEqual(["user_id", "user-a"]);
      expect(filters).toContainEqual(["status", "Active"]);
    });

    it("does not re-query on duplicate session events or token refresh", async () => {
      mocks.getSession.mockResolvedValueOnce({ data: { session } });
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("company-a:company_admin");
      const initialFromCalls = mocks.from.mock.calls.length;
      act(() => {
        mocks.callback?.("INITIAL_SESSION", session);
        mocks.callback?.("TOKEN_REFRESHED", session);
      });
      expect(mocks.from.mock.calls.length).toBe(initialFromCalls);
    });

    it("leaves companyId as null when user has no active membership", async () => {
      mocks.getSession.mockResolvedValueOnce({ data: { session } });
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

      // verifyOtp must NOT have been called automatically
      expect(mocks.verifyOtp).not.toHaveBeenCalled();
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
      expect(mocks.verifyOtp).not.toHaveBeenCalled();

      // User explicitly clicks
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(mocks.verifyOtp).toHaveBeenCalledWith({
          token_hash: "scanner-safe-token",
          type: "invite",
        });
      });

      // Attempt second click; must not verify twice
      fireEvent.click(continueBtn);
      expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);

      // After verification, loads invitation status and displays company and role
      await screen.findByText("Set up your account");
      expect(screen.getByText("Acme Nigeria")).toBeInTheDocument();
      expect(screen.getByText("Finance Officer")).toBeInTheDocument();
    });

    it("handles verifyOtp errors gracefully without crashing or submitting password", async () => {
      mocks.verifyOtp.mockResolvedValueOnce({
        data: { session: null },
        error: { message: "Token has expired or is invalid" },
      });

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
      expect(mocks.updateUser).not.toHaveBeenCalled();
      expect(mocks.invoke).not.toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
    });

    it("completes full acceptance: verifies token, sets password, calls accept_invitation, and verifies active membership", async () => {
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
        expect(mocks.updateUser).toHaveBeenCalledWith({ password: "SecretPass123!" });
        expect(mocks.invoke).toHaveBeenCalledWith("tenant-admin", { body: { action: "accept_invitation" } });
      });

      // 4. Verifies active membership and enters dashboard
      await screen.findByText("Company Workspace Dashboard");
    });
  });

  describe("ProtectedRoute safeguards", () => {
    it("blocks tenant routes for users without active company access and avoids redirect loop", async () => {
      mocks.getSession.mockResolvedValueOnce({ data: { session } });
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
      mocks.getSession.mockResolvedValueOnce({ data: { session } });
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

  describe("Signup trigger metadata and email verification", () => {
    it("submits all company fields matching handle_new_user and displays honest email verification message", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/signup"]}>
          <Signup />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Chidi Anagonye" } });
      fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "chidi@ethics.ng" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "SuperSecret123" } });
      fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Ethics Consulting Ltd" } });
      fireEvent.change(screen.getByLabelText("TIN"), { target: { value: "NG-99887766" } });

      fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

      await waitFor(() => {
        expect(mocks.signUp).toHaveBeenCalledWith({
          email: "chidi@ethics.ng",
          password: "SuperSecret123",
          options: {
            emailRedirectTo: `${window.location.origin}/app/dashboard`,
            data: {
              display_name: "Chidi Anagonye",
              company_name: "Ethics Consulting Ltd",
              tin: "NG-99887766",
              industry: "Technology & Software",
            },
          },
        });
      });

      // Honest email verification screen
      await screen.findByText("Verify your email");
      expect(screen.getByText("chidi@ethics.ng")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Proceed to Sign in/i })).toBeInTheDocument();
    });
  });
});