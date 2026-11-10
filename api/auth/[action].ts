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

const GENERIC_REGISTER_MESSAGE =
  "If this email can be registered, we have sent a confirmation link. Confirm your email to activate your workspace.";
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function cleanText(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim() : "";
}

export function parseRegistration(body: Record<string, unknown>):
  | { ok: true; value: { email: string; password: string; businessName: string; legalName: string | null; fullName: string; captchaToken: string } }
  | { ok: false; error: string } {
  const email = cleanText(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const confirmation = typeof body.passwordConfirmation === "string" ? body.passwordConfirmation : "";
  const businessName = cleanText(body.businessName);
  const legalName = cleanText(body.legalName);
  const fullName = cleanText(body.fullName);
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";
  if (!captchaToken) return { ok: false, error: "Complete the CAPTCHA before registering." };
  if (businessName.length < 2 || businessName.length > 160) return { ok: false, error: "Enter a business name between 2 and 160 characters." };
  if (legalName.length > 200) return { ok: false, error: "Legal name must be 200 characters or fewer." };
  if (fullName.length < 2 || fullName.length > 120) return { ok: false, error: "Enter your full name (2 to 120 characters)." };
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid work email." };
  if (password.length < 12 || password.length > 128) return { ok: false, error: "Password must be between 12 and 128 characters long" };
  if (password !== confirmation) return { ok: false, error: "Passwords do not match." };
  return { ok: true, value: { email, password, businessName, legalName: legalName || null, fullName, captchaToken } };
}

export function registrationOrigin(): string {
  // Deployment-owned configuration only; never derive email links from request headers.
  const configured = process.env.AUTH_SITE_URL;
  if (!configured) throw new Error("AUTH_SITE_URL must be configured before registration is available");
  const url = new URL(configured);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
    || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production"
      && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("AUTH_SITE_URL must be a canonical HTTPS site origin");
  }
  return url.origin;
}

async function completeRegistration(client: ReturnType<typeof createAuthClient>, user: { user_metadata?: Record<string, unknown> }): Promise<{ provisioned: boolean; invitationPending: boolean }> {
  const { data, error } = await client.rpc("complete_business_registration");
  if (error) {
    // Source can ship before the reviewed migration. Only a missing RPC is tolerated
    // for pre-existing accounts; actual provisioning failures are never ignored.
    if (error.code === "PGRST202" && user.user_metadata?.tsflow_signup_intent !== "business_registration") {
      return { provisioned: false, invitationPending: false };
    }
    throw new Error("Your workspace setup could not be completed. Please sign in again to retry.");
  }
  if (!data || typeof data !== "object" || data.ok !== true || typeof data.provisioned !== "boolean"
    || (data.invitation_pending !== undefined && typeof data.invitation_pending !== "boolean")) {
    throw new Error("Workspace setup could not be confirmed. Please sign in again to retry.");
  }
  const invitationPending = data.invitation_pending === true;
  if (!data.provisioned && !invitationPending && user.user_metadata?.tsflow_signup_intent === "business_registration") {
    throw new Error("Your registration is unavailable or expired. Please contact your administrator.");
  }
  return { provisioned: data.provisioned, invitationPending };
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

  if (!["login", "logout", "verify-invite", "update-password", "register", "resend-confirmation", "confirm-signup", "recover-workspace"].includes(action)) {
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

    if (action === "resend-confirmation") {
      const email = cleanText(body.email).toLowerCase();
      const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";
      if (!EMAIL_PATTERN.test(email) || email.length > 320 || !captchaToken) {
        respondJson(res, 400, { error: "A valid email and CAPTCHA are required." });
        return;
      }
      const origin = registrationOrigin();
      if (req.headers.origin !== origin) {
        respondJson(res, 403, { error: "Confirmation resend is not available from this site." });
        return;
      }
      const { error } = await client.auth.resend({
        type: "signup",
        email,
        options: { captchaToken, emailRedirectTo: `${origin}/auth/confirm` },
      });
      if (error && /captcha/i.test(error.message)) {
        respondJson(res, 400, { error: "CAPTCHA verification failed. Please try again." });
        return;
      }
      if (error) console.error("[auth/resend-confirmation] Resend rejected", error.status ?? "unknown");
      respondJson(res, 200, { ok: true, message: GENERIC_REGISTER_MESSAGE });
      return;
    }

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
      // Finish a confirmed self-service registration (no-op for everyone else).
      let completion: { provisioned: boolean; invitationPending: boolean };
      try {
        completion = await completeRegistration(client, data.user);
      } catch (error) {
        await client.auth.signOut();
        respondJson(res, 409, { error: error instanceof Error ? error.message : "Workspace setup failed. Please sign in to retry." });
        return;
      }
      respondJson(res, 200, {
        user: { ...publicUser(data.user), invitation_pending: completion.invitationPending },
      });
      return;
    }

    if (action === "register") {
      const parsed = parseRegistration(body);
      if (parsed.ok === false) {
        respondJson(res, 400, { error: parsed.error });
        return;
      }
      const origin = registrationOrigin();
      if (req.headers.origin !== origin) {
        respondJson(res, 403, { error: "Registration is not available from this site." });
        return;
      }
      const { email, password, businessName, legalName, fullName, captchaToken } = parsed.value;
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          emailRedirectTo: `${origin}/auth/confirm`,
          // Only intent + display data; company id and role are never accepted from clients.
          data: {
            display_name: fullName,
            business_name: businessName,
            legal_name: legalName,
            tsflow_signup_intent: "business_registration",
          },
        },
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (/captcha/.test(message)) {
          respondJson(res, 400, { error: "CAPTCHA verification failed. Please try again." });
          return;
        }
        if (error.status === 429 || /rate limit/.test(message)) {
          respondJson(res, 429, { error: "Too many attempts. Please wait and try again." });
          return;
        }
        if (/signups? not allowed|signup.*disabled/.test(message)) {
          respondJson(res, 503, { error: "Registration is not available right now." });
          return;
        }
        // Duplicate emails, pending invitations and trigger rejections all get the generic reply.
        console.error("[auth/register] Sign-up rejected", error.status ?? "unknown");
      }
      if (data?.session) {
        // Never grant a session before email confirmation, even if auto-confirm is misconfigured.
        await client.auth.signOut();
      }
      respondJson(res, 200, { ok: true, message: GENERIC_REGISTER_MESSAGE });
      return;
    }

    if (action === "confirm-signup") {
      const tokenHash = typeof body.token_hash === "string" ? body.token_hash : "";
      if (!tokenHash) {
        respondJson(res, 400, { error: "Confirmation token is required" });
        return;
      }
      const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      if (error || !data.user || !data.user.email_confirmed_at) {
        respondJson(res, 400, { error: "This confirmation link is invalid or has expired." });
        return;
      }
      const completion = await completeRegistration(client, data.user);
      if (!completion.provisioned && !completion.invitationPending) {
        respondJson(res, 409, { error: "Your email is confirmed, but the workspace could not be set up. Sign in to retry." });
        return;
      }
      respondJson(res, 200, {
        user: { ...publicUser(data.user), invitation_pending: completion.invitationPending },
      });
      return;
    }

    if (action === "recover-workspace") {
      const session = await getAuthenticatedSession(client);
      if (!session) {
        respondJson(res, 401, { error: "Sign in to recover your workspace." });
        return;
      }
      const businessName = cleanText(body.businessName);
      const city = cleanText(body.city);
      const state = cleanText(body.state);
      if (businessName.length < 2 || businessName.length > 160 || city.length > 120 || state.length > 120) {
        respondJson(res, 400, { error: "Enter a business name between 2 and 160 characters. City and state must be 120 characters or fewer." });
        return;
      }
      const { data, error } = await client.rpc("recover_business_registration", {
        p_business_name: businessName,
        p_city: city || null,
        p_state: state || null,
      });
      if (error) {
        respondJson(res, 409, { error: "Workspace recovery could not be completed. Sign in again or contact your company administrator." });
        return;
      }
      if (data && typeof data === "object" && data.invitation_pending === true) {
        respondJson(res, 409, { error: "A pending company invitation must be accepted first.", invitation_pending: true });
        return;
      }
      if (!data || typeof data !== "object" || data.ok !== true || data.provisioned !== true) {
        respondJson(res, 409, { error: "Workspace recovery could not be confirmed. Please retry." });
        return;
      }
      respondJson(res, 200, { ok: true, user: publicUser(session.user) });
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
