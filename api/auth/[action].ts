import type { ApiHandler, ApiRequest } from "../_lib/vercel.js";
import {
  createAuthClient,
  getAuthenticatedSession,
  hasSameOrigin,
  methodNotAllowed,
  respondJson,
} from "../_lib/session.js";
import { PASSWORD_POLICY_SUMMARY, passwordPolicyError } from "../_lib/passwordPolicy.js";

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

// Deliberately omit messages and request data: Auth errors can contain secrets.
function diagnose(action: string, event: string, error?: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error({
    action, event,
    code: typeof value.code === "string" && /^[a-zA-Z0-9_]{1,64}$/.test(value.code) ? value.code : null,
    status: typeof value.status === "number" ? value.status : null,
  });
}

function registrationAuthFailure(action: string, error: { code?: string; status?: number; message: string }) {
  diagnose(action, "auth_rejected", error);
  // Weak-password rejections are actionable and reveal nothing about the account.
  if (error.code === "weak_password" || (error.status === 422 && /password/i.test(error.message) && !/already|invitation/i.test(error.message))
    || /^Password should (be|contain)/i.test(error.message)) {
    return { status: 400, body: { error: PASSWORD_POLICY_SUMMARY } };
  }
  if (error.status && error.status >= 500) {
    return { status: 503, body: { error: "Registration is temporarily unavailable. Please try again later." } };
  }
  if (error.code === "captcha_failed" || (!error.code && /captcha/i.test(error.message))) {
    return { status: 400, body: { error: "CAPTCHA verification failed. Please try again." } };
  }
  if (error.status === 429 || /rate limit/i.test(error.message)) {
    return { status: 429, body: { error: "Too many attempts. Please wait and try again." } };
  }
  if (error.code === "signup_disabled" || /signups? not allowed|signup.*disabled/i.test(error.message)) {
    return { status: 503, body: { error: "Registration is not available right now." } };
  }
  // Only evidenced duplicate/privacy cases are success-shaped. Database/trigger
  // failures are unexpected even if their HTTP status is 400.
  if (["user_already_exists", "email_exists"].includes(error.code ?? "")
    || (error.status === 400 && /^(User already registered|This email has a pending company invitation\.)/i.test(error.message))) {
    return { status: 200, body: { ok: true, message: GENERIC_REGISTER_MESSAGE } };
  }
  return { status: 503, body: { error: "Registration is temporarily unavailable. Please try again later." } };
}

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
  const passwordError = passwordPolicyError(password);
  if (passwordError) return { ok: false, error: passwordError };
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

async function completeRegistration(client: ReturnType<typeof createAuthClient>, user: { user_metadata?: Record<string, unknown> }): Promise<boolean> {
  const { data, error } = await client.rpc("complete_business_registration");
  if (error) {
    diagnose("complete-registration", "rpc_rejected", error);
    // Source can ship before the reviewed migration. Only a missing RPC is tolerated
    // for pre-existing accounts; actual provisioning failures are never ignored.
    if (error.code === "PGRST202" && user.user_metadata?.tsflow_signup_intent !== "business_registration") return false;
    throw new Error("Your workspace setup could not be completed. Please sign in again to retry.");
  }
  if (!data || typeof data !== "object" || data.ok !== true || typeof data.provisioned !== "boolean") {
    diagnose("complete-registration", "invalid_rpc_response");
    throw new Error("Workspace setup could not be confirmed. Please sign in again to retry.");
  }
  if (!data.provisioned && user.user_metadata?.tsflow_signup_intent === "business_registration") {
    throw new Error("Your registration is unavailable or expired. Please contact your administrator.");
  }
  return data.provisioned;
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
      // A failed confirmation must never become a usable pending-registration
      // session on reload. GET only checks access; it never provisions a tenant.
      if (session?.user.user_metadata?.tsflow_signup_intent === "business_registration") {
        const { data, error } = await client.from("company_members").select("company_id")
          .eq("user_id", session.user.id).eq("status", "Active").limit(1);
        if (error || !data?.length) {
          diagnose("session", "registration_access_unconfirmed", error);
          await client.auth.signOut();
          respondJson(res, 409, { error: "Workspace setup is incomplete. Sign in to retry." });
          return;
        }
      }
      respondJson(res, 200, { user: session ? publicUser(session.user) : null });
    } catch (error) {
      diagnose("session", "session_validation_failed", error);
      respondJson(res, 503, { error: "Session validation is temporarily unavailable" });
    }
    return;
  }

  if (!["login", "logout", "verify-invite", "update-password", "register", "resend-signup", "confirm-signup"].includes(action)) {
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
    // Registration links and confirmation requests use the deployment-owned
    // origin, not Host/forwarded headers. Preview/local origins must be configured
    // explicitly through AUTH_SITE_URL; there is no guessed fallback.
    const origin = ["register", "resend-signup", "confirm-signup"].includes(action) ? registrationOrigin() : null;
    if (origin && req.headers.origin !== origin) {
      respondJson(res, 403, { error: "Registration is not available from this site." });
      return;
    }
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
      // Finish a confirmed self-service registration (no-op for everyone else).
      try {
        await completeRegistration(client, data.user);
      } catch (error) {
        await client.auth.signOut();
        respondJson(res, 409, { error: error instanceof Error ? error.message : "Workspace setup failed. Please sign in to retry." });
        return;
      }
      respondJson(res, 200, { user: publicUser(data.user) });
      return;
    }

    if (action === "register") {
      const parsed = parseRegistration(body);
      if (parsed.ok === false) {
        respondJson(res, 400, { error: parsed.error });
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
        const failure = registrationAuthFailure(action, error);
        respondJson(res, failure.status, failure.body);
        return;
      }
      if (data?.session) {
        // Never grant a session before email confirmation, even if auto-confirm is misconfigured.
        await client.auth.signOut();
      }
      respondJson(res, 200, { ok: true, message: GENERIC_REGISTER_MESSAGE });
      return;
    }

    if (action === "resend-signup") {
      const email = cleanText(body.email).toLowerCase();
      const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";
      if (!captchaToken || email.length > 320 || !EMAIL_PATTERN.test(email)) {
        respondJson(res, 400, { error: "A valid email and CAPTCHA are required." });
        return;
      }
      const { error } = await client.auth.resend({
        type: "signup", email, options: { captchaToken, emailRedirectTo: `${origin}/auth/confirm` },
      });
      if (error) {
        // Already-confirmed emails get the same privacy-preserving response.
        if (error.status !== undefined && error.status < 500 && (error.code === "user_not_found"
          || /already confirmed/i.test(error.message))) {
          diagnose(action, "privacy_response", error);
        } else {
          const failure = registrationAuthFailure(action, error);
          respondJson(res, failure.status, failure.body);
          return;
        }
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
        diagnose(action, "token_verification_failed", error);
        await client.auth.signOut();
        respondJson(res, error && error.status && error.status >= 500 ? 503 : 400, { error: "This confirmation link could not be verified. Request a new link or try again later." });
        return;
      }
      try {
        const provisioned = await completeRegistration(client, data.user);
        if (!provisioned) throw new Error("Your email is confirmed, but the workspace could not be set up. Sign in to retry.");
      } catch (error) {
        await client.auth.signOut();
        respondJson(res, 409, { error: error instanceof Error ? error.message : "Workspace setup failed. Sign in to retry." });
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
    diagnose(action, "operation_failed", error);
    respondJson(res, 503, { error: "The authentication service is temporarily unavailable" });
  }
};

export default handler;
