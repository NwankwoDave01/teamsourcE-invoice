export interface SessionUser {
  id: string;
  email: string | null;
  display_name?: string | null;
  invitation_pending?: boolean;
}

interface AuthResponse {
  user?: SessionUser | null;
  error?: string;
}

async function readResponse(response: Response, endpoint: string): Promise<AuthResponse> {
  const rawBody = await response.text();
  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    const contentType = response.headers.get("content-type");
    const responseType = contentType ? `, ${contentType}` : "";
    throw new Error(
      `Authentication endpoint ${endpoint} returned a non-JSON response (HTTP ${response.status} ${response.statusText}${responseType}). Check Vercel API routing.`,
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const responseType = rawBody ? "invalid JSON response" : "an empty response";
    throw new Error(
      `Authentication endpoint ${endpoint} returned ${responseType} (HTTP ${response.status} ${response.statusText}). Check Vercel API routing.`,
    );
  }
  return body as AuthResponse;
}

async function postAuth(path: string, body: Record<string, string>): Promise<SessionUser | null> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readResponse(response, `/api/auth/${path}`);
  if (!response.ok) throw new Error(result.error || "Authentication request failed.");
  return result.user ?? null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/session", { credentials: "same-origin" });
  if (response.status === 401) return null;
  const result = await readResponse(response, "/api/auth/session");
  if (!response.ok) throw new Error(result.error || "Session validation failed.");
  return result.user ?? null;
}

export async function signInWithPassword(email: string, password: string, captchaToken: string) {
  return postAuth("login", { email, password, captchaToken });
}

export async function signOutFromSession() {
  await postAuth("logout", {});
}

export async function verifyInvitation(tokenHash: string) {
  return postAuth("verify-invite", { token_hash: tokenHash });
}

export async function updateAccountPassword(password: string) {
  return postAuth("update-password", { password });
}

export interface RegistrationInput {
  businessName: string;
  legalName: string;
  fullName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  captchaToken: string;
}

export async function registerBusiness(input: RegistrationInput): Promise<string> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await readResponse(response, "/api/auth/register") as AuthResponse & { message?: string };
  if (!response.ok) throw new Error(result.error || "Registration failed.");
  return result.message ?? "Check your email to confirm your account.";
}

export async function resendSignupConfirmation(email: string, captchaToken: string): Promise<string> {
  const response = await fetch("/api/auth/resend-confirmation", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, captchaToken }),
  });
  const result = await readResponse(response, "/api/auth/resend-confirmation") as AuthResponse & { message?: string };
  if (!response.ok) throw new Error(result.error || "Confirmation resend failed.");
  return result.message ?? "If this email can be confirmed, we have sent a confirmation link.";
}

export async function confirmSignup(tokenHash: string) {
  return postAuth("confirm-signup", { token_hash: tokenHash });
}

export async function recoverBusinessWorkspace(input: { businessName: string; city: string; state: string }) {
  const response = await fetch("/api/auth/recover-workspace", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await readResponse(response, "/api/auth/recover-workspace") as AuthResponse & { invitation_pending?: boolean };
  if (!response.ok) {
    const error = new Error(result.error || "Workspace recovery failed.") as Error & { invitationPending?: boolean };
    error.invitationPending = result.invitation_pending === true;
    throw error;
  }
  return result.user ?? null;
}
