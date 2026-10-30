import type { ApiHandler, ApiRequest } from "../_lib/vercel.js";
import {
  createAuthClient,
  getAuthenticatedSession,
  hasSameOrigin,
  methodNotAllowed,
  respondJson,
} from "../_lib/session.js";

function requestBody(req: ApiRequest): Record<string, unknown> {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {};
}

function publicUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const displayName = user.user_metadata?.display_name;
  return {
    id: user.id,
    email: user.email ?? null,
    display_name: typeof displayName === "string" ? displayName : null,
  };
}

const handler: ApiHandler = async (req, res) => {
  const action = req.query.action;
  if (typeof action !== "string") {
    respondJson(res, 404, { error: "Not found" });
    return;
  }

  if (action === "session") {
    if (req.method !== "GET") {
      methodNotAllowed(res, "GET");
      return;
    }

    try {
      const client = createAuthClient(req, res);
      const session = await getAuthenticatedSession(client);
      respondJson(res, 200, { user: session ? publicUser(session.user) : null });
    } catch (error) {
      console.error("[auth/session] Session validation failed", error);
      respondJson(res, 503, { error: "Session validation is temporarily unavailable" });
    }
    return;
  }

  if (!["login", "logout", "verify-invite", "update-password"].includes(action)) {
    respondJson(res, 404, { error: "Not found" });
    return;
  }
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  if (!hasSameOrigin(req)) {
    respondJson(res, 403, { error: "Cross-origin request rejected" });
    return;
  }

  try {
    const client = createAuthClient(req, res);
    const body = requestBody(req);

    if (action === "login") {
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
      if (!email || !password || !captchaToken) {
        respondJson(res, 400, { error: "Email, password, and CAPTCHA are required" });
        return;
      }

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });
      if (error || !data.user) {
        respondJson(res, 401, { error: error?.message ?? "Sign-in failed" });
        return;
      }
      respondJson(res, 200, { user: publicUser(data.user) });
      return;
    }

    if (action === "logout") {
      const { error } = await client.auth.signOut();
      if (error) {
        console.error("[auth/logout] Supabase sign-out failed", error);
        respondJson(res, 502, { error: "The session could not be revoked" });
        return;
      }
      respondJson(res, 200, { ok: true });
      return;
    }

    if (action === "verify-invite") {
      const tokenHash = typeof body.token_hash === "string" ? body.token_hash : "";
      if (!tokenHash) {
        respondJson(res, 400, { error: "Invitation token is required" });
        return;
      }
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: "invite",
      });
      if (error || !data.user) {
        respondJson(res, 400, { error: error?.message ?? "Invitation link could not be verified" });
        return;
      }
      respondJson(res, 200, { user: publicUser(data.user) });
      return;
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12) {
      respondJson(res, 400, { error: "Password must be at least 12 characters long" });
      return;
    }
    const session = await getAuthenticatedSession(client);
    if (!session) {
      respondJson(res, 401, { error: "An active invitation session is required" });
      return;
    }
    const { data, error } = await client.auth.updateUser({ password });
    if (error || !data.user) {
      respondJson(res, 400, { error: error?.message ?? "Password update failed" });
      return;
    }
    respondJson(res, 200, { user: publicUser(data.user) });
  } catch (error) {
    console.error(`[auth/${action}] Authentication operation failed`, error);
    respondJson(res, 503, { error: "The authentication service is temporarily unavailable" });
  }
};

export default handler;
