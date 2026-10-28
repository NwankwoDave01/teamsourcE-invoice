import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import LandingPage from "@/pages/LandingPage";

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

  it("does not expose public workspace signup", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/signup"]}>
        <Signup />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Workspace access is invitation-only")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create workspace" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/auth/login");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("uses invitation-only guidance instead of signup links on login and landing pages", async () => {
    const { container } = renderLogin();
    expect(screen.getByText(/Access to .* is invitation-only/)).toBeInTheDocument();
    expect(container.querySelector('a[href="/auth/signup"]')).not.toBeInTheDocument();

    cleanup();
    const { container: landingContainer } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(landingContainer.querySelector('a[href="/auth/signup"]')).not.toBeInTheDocument();
    expect(screen.getByText(/Workspace access is invitation-only/)).toBeInTheDocument();
  });
});
