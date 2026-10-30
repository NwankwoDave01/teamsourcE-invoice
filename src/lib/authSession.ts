export interface SessionUser {
  id: string;
  email: string | null;
  display_name?: string | null;
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
