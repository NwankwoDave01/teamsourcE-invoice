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
  registerAccount: vi.fn(),
  verifySignup: vi.fn(),
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
  registerAccount: mocks.registerAccount,
  verifySignup: mocks.verifySignup,
}));

vi.mock("@/components/auth/TurnstileCaptcha", () => ({
  TurnstileCaptcha: ({ onTokenChange }: { onTokenChange: (token: string | null) => void }) => (
    <button type="button" onClick={() => onTokenChange("signup-test-token")}>Complete CAPTCHA</button>
  ),
}));

let filters: [string, unknown][];
let activeMembers: { company_id: string }[];
let membershipQueryError: Error | null;
let roleQueryError: Error | null;
const user = { id: "user-a", email: "user@example.com" };

function Probe() {
  const auth = useAuth();
  return (
    <>
      <div>{auth.loading ? "loading" : `${auth.companyId ?? "no-company"}:${auth.roles.join(",")}`}</div>
      <div data-testid="membership-count">{auth.memberships.length}</div>
      <div data-testid="authenticated-user">{auth.user?.id ?? "signed-out"}</div>
      <div data-testid="membership-error">{auth.membershipError ?? "membership-ok"}</div>
      <button onClick={() => void auth.signOut()}>Sign out probe</button>
      <button onClick={() => void auth.refreshMembership()}>Refresh membership probe</button>
      <button onClick={() => void auth.selectCompany("company-b")}>Select second company</button>
    </>
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/auth/login");
  filters = [];
  activeMembers = [{ company_id: "company-a" }];
  membershipQueryError = null;
  roleQueryError = null;
  mocks.invoke.mockReset().mockResolvedValue({
    data: { ok: true, company_name: "Acme Nigeria", role: "finance_officer", email: "user@example.com" },
    error: null,
  });
  mocks.getCurrentUser.mockReset().mockResolvedValue(null);
  mocks.signOutFromSession.mockReset().mockResolvedValue(undefined);
  mocks.updateAccountPassword.mockReset().mockResolvedValue(user);
  mocks.registerAccount.mockReset().mockResolvedValue(null);
  mocks.verifySignup.mockReset().mockResolvedValue(user);
  mocks.verifyInvitation.mockReset().mockImplementation(async () => {
    mocks.getCurrentUser.mockResolvedValue(user);
    return user;
  });

  mocks.from.mockReset().mockImplementation((table) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn((key, value) => {
        if (table === "company_members") filters.push([key, value]);
        return query;
      }),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: table === "company_members" ? activeMembers[0] ?? null : null,
        error: table === "company_members" ? membershipQueryError : null,
      })),
      then: (resolve: (value: unknown) => unknown) => {
        const result = table === "company_members"
          ? { data: activeMembers, error: membershipQueryError }
          : table === "companies"
            ? {
              data: activeMembers.map(({ company_id }) => ({
                id: company_id, name: "Acme", plan: "Starter", tin: "NG-PENDING",
              })),
              error: null,
            }
            : {
              data: [{ role: "company_admin", company_id: "company-a" }],
              error: roleQueryError,
            };
        return Promise.resolve(result).then(resolve);
      },
    };
    return query;
  });
});

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });

describe("Authentication & Invitation Flow Safeguards", () => {
  describe("AuthProvider normal sign-in", () => {
    it("verifies normal sessions without accepting invitations and loads Active membership", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("company-a:company_admin");
      expect(screen.getByTestId("authenticated-user")).toHaveTextContent("user-a");
      expect(mocks.invoke).not.toHaveBeenCalled();
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
      expect(mocks.invoke).not.toHaveBeenCalled();
    });

    it("keeps a valid session authenticated when no pending invitation exists", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMembers = [];
      render(<AuthProvider><Probe /></AuthProvider>);
      await screen.findByText("no-company:");
      expect(screen.getByTestId("authenticated-user")).toHaveTextContent("user-a");
      expect(mocks.invoke).not.toHaveBeenCalled();
      expect(filters).toContainEqual(["status", "Active"]);
    });

    it("does not auto-accept on the explicit invitation setup page", async () => {
      window.history.replaceState({}, "", "/auth/accept-invite");
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMembers = [];
      render(<AuthProvider><Probe /></AuthProvider>);
      await screen.findByText("no-company:");
      expect(mocks.invoke).not.toHaveBeenCalled();
      expect(mocks.from).not.toHaveBeenCalled();
    });

    it("ignores membership responses after sign-out", async () => {
      let finish: ((value: unknown) => void) | undefined;
      activeMembers = [];
      mocks.from.mockImplementationOnce((table) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((key, value) => {
            if (table === "company_members") filters.push([key, value]);
            return query;
          }),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => new Promise((resolve) => { finish = resolve; })),
          then: (resolve: (value: unknown) => unknown) =>
            new Promise((resolve) => { finish = resolve; }).then(resolve),
        };
        return query;
      });
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      render(<AuthProvider><Probe /></AuthProvider>);
      await waitFor(() => expect(finish).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: "Sign out probe" }));
      await waitFor(() => expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1));
      await act(async () => { finish?.({ data: null, error: null }); });
      expect(screen.getByTestId("authenticated-user")).toHaveTextContent("signed-out");
    });

    it("preserves the authenticated user and reports membership query failures", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      membershipQueryError = new Error("membership unavailable");
      render(<AuthProvider><Probe /></AuthProvider>);

      expect(await screen.findByTestId("membership-error")).toHaveTextContent("Company membership could not be loaded.");
      expect(screen.getByTestId("authenticated-user")).toHaveTextContent("user-a");
      expect(screen.getByText("no-company:")).toBeInTheDocument();
    });

    it("keeps active membership when the independent role query fails", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      roleQueryError = new Error("roles unavailable");
      render(<AuthProvider><Probe /></AuthProvider>);

      expect(await screen.findByTestId("membership-error")).toHaveTextContent("User roles could not be loaded.");
      expect(screen.getByText("company-a:")).toBeInTheDocument();
      expect(screen.getByTestId("authenticated-user")).toHaveTextContent("user-a");
    });

    it("leaves companyId as null when user has no active membership", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMembers = [];
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await screen.findByText("no-company:");
      expect(screen.getByTestId("authenticated-user")).toHaveTextContent("user-a");
      expect(filters).toContainEqual(["status", "Active"]);
    });

    it("loads and revalidates multiple active company memberships before switching", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMembers = [{ company_id: "company-a" }, { company_id: "company-b" }];
      render(<AuthProvider><Probe /></AuthProvider>);

      await screen.findByText("company-a:company_admin");
      expect(screen.getByTestId("membership-count")).toHaveTextContent("2");
      fireEvent.click(screen.getByRole("button", { name: "Select second company" }));

      await screen.findByText("company-b:");
      expect(screen.getByTestId("membership-count")).toHaveTextContent("2");
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

    it("does not enter the dashboard unless active membership is confirmed", async () => {
      mocks.getCurrentUser.mockResolvedValue(user);
      activeMembers = [];
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
      fireEvent.change(screen.getByLabelText("Set password"), { target: { value: "SecretPass123!" } });
      fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "SecretPass123!" } });
      fireEvent.click(screen.getByRole("button", { name: /Set password & accept invitation/i }));

      expect(await screen.findByText("Active company membership was not confirmed by the server.")).toBeInTheDocument();
      expect(screen.queryByText("Company Workspace Dashboard")).not.toBeInTheDocument();
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
    it("allows verified users without a membership to reach company onboarding", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMembers = []; // No active company
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
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    it("blocks company routes and shows a retry when membership could not be retrieved", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      membershipQueryError = new Error("membership unavailable");
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

      expect(await screen.findByRole("alert")).toHaveTextContent("Company membership could not be loaded.");
      expect(screen.queryByText("Tenant Content")).not.toBeInTheDocument();
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    it("allows tenant access when active company membership is present", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(user);
      activeMembers = [{ company_id: "company-a" }];
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

  describe("Public signup", () => {
    it("allows a user to begin registration without a company invitation", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/signup"]}>
          <AuthProvider>
            <Signup />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toHaveAttribute("minLength", "12");
    });
  });
});