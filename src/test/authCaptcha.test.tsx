import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import LandingPage from "@/pages/LandingPage";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  registerBusiness: vi.fn(),
  resendSignup: vi.fn(),
  refreshSession: vi.fn(),
  toast: vi.fn(),
  membershipError: null as string | null,
}));

vi.mock("@/lib/authSession", () => ({
  signInWithPassword: mocks.signInWithPassword,
  registerBusiness: mocks.registerBusiness,
  resendSignup: mocks.resendSignup,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signOut: vi.fn(),
    refreshSession: mocks.refreshSession,
    authError: null,
    membershipError: mocks.membershipError,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: (props: {
    onSuccess?: (token: string) => void;
    onExpire?: (token: string) => void;
    onError?: (error: string) => void;
  }) => createElement(
    "div",
    { "data-testid": "turnstile-widget" },
    createElement("button", {
      type: "button",
      onClick: () => props.onSuccess?.("turnstile-test-token"),
    }, "Complete CAPTCHA"),
    createElement("button", {
      type: "button",
      onClick: () => props.onExpire?.(""),
    }, "Expire CAPTCHA"),
    createElement("button", {
      type: "button",
      onClick: () => props.onError?.("network-error"),
    }, "Fail CAPTCHA"),
  ),
}));

beforeEach(() => {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "turnstile-test-site-key");
  mocks.signInWithPassword.mockReset().mockResolvedValue({ id: "user-a", email: "user@example.com" });
  mocks.registerBusiness.mockReset().mockResolvedValue("If this email can be registered, check your email to confirm.");
  mocks.resendSignup.mockReset().mockResolvedValue("If this email can be registered, check your email to confirm.");
  mocks.refreshSession.mockReset().mockResolvedValue({ id: "user-a", email: "user@example.com" });
  mocks.toast.mockReset();
  mocks.membershipError = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/auth/login"]}>
      <Routes>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/app/dashboard" element={<div>Workspace dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "user@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "valid-password" } });
}

describe("Turnstile authentication", () => {
  it("submits a completed CAPTCHA token with password sign-in", async () => {
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByText("Workspace dashboard");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith(
      "user@example.com",
      "valid-password",
      "turnstile-test-token",
    );
  });

  it("blocks sign-in when the CAPTCHA token is missing or expired", async () => {
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Complete the CAPTCHA before signing in.")).toHaveAttribute("role", "alert");
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail CAPTCHA" }));
    expect(await screen.findByText("CAPTCHA could not be completed. Check your connection and try again.")).toHaveAttribute("role", "alert");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Expire CAPTCHA" }));
    expect(await screen.findByText("CAPTCHA expired. Please complete it again before continuing.")).toHaveAttribute("role", "alert");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("requires a fresh CAPTCHA after a failed sign-in", async () => {
    mocks.signInWithPassword.mockRejectedValueOnce(new Error("Invalid login credentials"));
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Complete the CAPTCHA before signing in.")).toBeInTheDocument();
    expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it("reports credential rejection separately from CAPTCHA failures", async () => {
    mocks.signInWithPassword.mockRejectedValueOnce(new Error("Invalid login credentials"));
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Invalid credentials",
    })));

    mocks.toast.mockClear();
    mocks.signInWithPassword.mockRejectedValueOnce(new Error("CAPTCHA verification failed"));
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "CAPTCHA verification failed",
    })));
  });

  it("reports a session-verification failure separately from invalid credentials", async () => {
    mocks.refreshSession.mockRejectedValueOnce(new Error("Session validation is temporarily unavailable"));
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Session verification failed",
      description: "Session validation is temporarily unavailable",
    })));
  });

  it("reports a missing verified session as a session-verification failure", async () => {
    mocks.refreshSession.mockResolvedValueOnce(null);
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Session verification failed",
      description: "The new session could not be verified.",
    })));
  });

  it("completes login when membership retrieval reports an error", async () => {
    mocks.membershipError = "Company membership could not be loaded.";
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByText("Workspace dashboard");
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("requires CAPTCHA and sends registration fields without company IDs or roles", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/signup"]}>
        <Signup />
      </MemoryRouter>,
    );

    for (const [label, value] of [["Business name", "Test Business"], ["Full name", "Test User"], ["Work email", "user@example.com"], ["Password", "secure-password"], ["Confirm password", "secure-password"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(mocks.registerBusiness).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.registerBusiness).toHaveBeenCalledWith({
      businessName: "Test Business", legalName: "", fullName: "Test User", email: "user@example.com",
      password: "secure-password", passwordConfirmation: "secure-password", captchaToken: "turnstile-test-token",
    }));
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    await screen.findByRole("button", { name: "Resend confirmation" });
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(mocks.resendSignup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    await waitFor(() => expect(mocks.resendSignup).toHaveBeenCalledWith("user@example.com", "turnstile-test-token"));
  });

  it("links to business registration while retaining separate invitation guidance", async () => {
    const { container } = renderLogin();
    expect(container.querySelector('a[href="/auth/signup"]')).toBeInTheDocument();

    cleanup();
    const { container: landingContainer } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(landingContainer.querySelector('a[href="/auth/signup"]')).toBeInTheDocument();
  });
});
