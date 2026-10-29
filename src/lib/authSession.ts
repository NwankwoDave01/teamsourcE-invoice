export interface SessionUser {
  id: string;
  email: string | null;
  display_name?: string | null;
}

interface AuthResponse {
  user?: SessionUser | null;
  error?: string;
}

async function readResponse(response: Response): Promise<AuthResponse> {
  const body: unknown = await response.json();
  if (!body || typeof body !== "object") {
    throw new Error("Authentication service returned an invalid response.");
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
  const result = await readResponse(response);
  if (!response.ok) throw new Error(result.error || "Authentication request failed.");
  return result.user ?? null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/session", { credentials: "same-origin" });
  if (response.status === 401) return null;
  const result = await readResponse(response);
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
