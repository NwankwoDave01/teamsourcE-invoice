import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
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
  mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
  mocks.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mocks.toast.mockReset();
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
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "valid-password",
      options: { captchaToken: "turnstile-test-token" },
    });
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
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });
    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Complete the CAPTCHA before signing in.")).toBeInTheDocument();
    expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it("submits the CAPTCHA token with the existing signup request", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/signup"]}>
        <Signup />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Chidi Anagonye" } });
    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "chidi@ethics.ng" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "SuperSecret123" } });
    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Ethics Consulting Ltd" } });
    fireEvent.change(screen.getByLabelText("TIN"), { target: { value: "NG-99887766" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete CAPTCHA" }));
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await screen.findByText("Verify your email");
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "chidi@ethics.ng",
      password: "SuperSecret123",
      options: {
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
        captchaToken: "turnstile-test-token",
        data: {
          display_name: "Chidi Anagonye",
          company_name: "Ethics Consulting Ltd",
          tin: "NG-99887766",
          industry: "Technology & Software",
        },
      },
    });
  });
});
