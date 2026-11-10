import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest, ApiResponse } from "../../api/_lib/vercel";
import authHandler, { parseRegistration, registrationOrigin } from "../../api/auth/[action]";
import supabaseHandler from "../../api/supabase-proxy";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    refreshSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    verifyOtp: vi.fn(),
    updateUser: vi.fn(),
    signUp: vi.fn(),
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

const user = {
  id: "user-a",
  email: "user@example.com",
  user_metadata: { display_name: "Example User" },
};
const activeSession = {
  access_token: "user-access-token",
  refresh_token: "user-refresh-token",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

function makeRequest(
  method: string,
  url: string,
  body: unknown = {},
  headers: Record<string, string> = {},
): ApiRequest {
  const parsed = new URL(url, "https://app.example.com");
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of parsed.searchParams) query[key] = value;
  const authRoute = parsed.pathname.startsWith("/api/auth/");
  if (authRoute) query.action = parsed.pathname.slice("/api/auth/".length);
  return {
    method,
    url: `${parsed.pathname}${parsed.search}`,
    query,
    cookies: {},
    body,
    headers: {
      host: "app.example.com",
      origin: "https://app.example.com",
      "x-forwarded-proto": "https",
      ...headers,
    },
  } as unknown as ApiRequest;
}

function makeResponse() {
  const headers = new Map<string, string | string[]>();
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), Array.isArray(value) ? [...value] : String(value));
      return this;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return { response: response as unknown as ApiResponse, headers, result: response };
}

function setCookie(options: { cookies: { setAll: (cookies: unknown[], headers: Record<string, string>) => void } }) {
  options.cookies.setAll(
    [{ name: "__Host-tsflow-auth-token.0", value: "private-token", options: { path: "/", maxAge: 3600 } }],
    { "Cache-Control": "private, no-store" },
  );
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  vi.stubEnv("AUTH_SITE_URL", "https://app.example.com");
  mocks.auth.getSession.mockReset().mockResolvedValue({ data: { session: activeSession }, error: null });
  mocks.auth.getUser.mockReset().mockResolvedValue({ data: { user }, error: null });
  mocks.auth.refreshSession.mockReset().mockResolvedValue({ data: { session: activeSession }, error: null });
  mocks.auth.signInWithPassword.mockReset().mockResolvedValue({ data: { user }, error: null });
  mocks.auth.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.auth.verifyOtp.mockReset().mockResolvedValue({ data: { user }, error: null });
  mocks.auth.updateUser.mockReset().mockResolvedValue({ data: { user }, error: null });
  mocks.auth.signUp.mockReset().mockResolvedValue({ data: { user: null, session: null }, error: null });
  mocks.rpc.mockReset().mockResolvedValue({ data: { ok: true, provisioned: false }, error: null });
  mocks.createServerClient.mockReset().mockReturnValue({ auth: mocks.auth, rpc: mocks.rpc });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Vercel-managed Supabase sessions", () => {
  const registration = {
    businessName: "Example Business", legalName: "", fullName: "Example User",
    email: "USER@example.com", password: "example-password", passwordConfirmation: "example-password", captchaToken: "captcha-token",
  };

  it("normalizes registration details and rejects invalid fields", () => {
    expect(parseRegistration({ ...registration, businessName: "  Example  Business  " })).toEqual({
      ok: true, value: { email: "user@example.com", password: "example-password", businessName: "Example Business", legalName: null, fullName: "Example User", captchaToken: "captcha-token" },
    });
    for (const invalid of [{ businessName: "x" }, { fullName: "x" }, { legalName: "x".repeat(201) }, { email: "invalid" }, { password: "short" }, { passwordConfirmation: "different-password" }]) {
      expect(parseRegistration({ ...registration, ...invalid }).ok).toBe(false);
    }
  });

  it("requires CAPTCHA before any signup call", async () => {
    const { response, result } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/register", { ...registration, captchaToken: "" }), response);
    expect(result.statusCode).toBe(400);
    expect(mocks.auth.signUp).not.toHaveBeenCalled();
  });

  it("passes CAPTCHA to Auth and ignores client tenant and role fields", async () => {
    const { response, result } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/register", { ...registration, company_id: "attacker-tenant", role: "super_admin", tsflow_invitation_nonce: "attacker-nonce" }), response);
    expect(result.statusCode).toBe(200);
    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: "user@example.com", password: "example-password", options: {
        captchaToken: "captcha-token", emailRedirectTo: "https://app.example.com/auth/confirm",
        data: { display_name: "Example User", business_name: "Example Business", legal_name: null, tsflow_signup_intent: "business_registration" },
      },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns the same generic response for duplicates and invitation-trigger rejections", async () => {
    const success = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/register", registration), success.response);
    for (const message of ["User already registered", "This email has a pending company invitation."]) {
      mocks.auth.signUp.mockResolvedValueOnce({ data: null, error: { message, status: 400 } });
      const rejected = makeResponse();
      await authHandler(makeRequest("POST", "/api/auth/register", registration), rejected.response);
      expect(rejected.result.statusCode).toBe(200);
      expect(rejected.result.body).toEqual(success.result.body);
    }
  });

  it("reports server-side CAPTCHA rejection without claiming registration succeeded", async () => {
    mocks.auth.signUp.mockResolvedValueOnce({ data: null, error: { message: "CAPTCHA verification failed", status: 400 } });
    const { response, result } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/register", registration), response);
    expect(result.statusCode).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects unconfigured or insecure canonical origins and header-injected redirects", async () => {
    vi.stubEnv("AUTH_SITE_URL", "");
    expect(() => registrationOrigin()).toThrow();
    vi.stubEnv("AUTH_SITE_URL", "http://app.example.com");
    expect(() => registrationOrigin()).toThrow();
    vi.stubEnv("AUTH_SITE_URL", "https://app.example.com");
    const { response, result } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/register", registration, { host: "attacker.example", origin: "https://attacker.example" }), response);
    expect(result.statusCode).toBe(403);
    expect(mocks.auth.signUp).not.toHaveBeenCalled();
  });

  it("discards any premature signup session and never provisions on signup", async () => {
    mocks.auth.signUp.mockResolvedValueOnce({ data: { user, session: activeSession }, error: null });
    const { response } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/register", registration), response);
    expect(mocks.auth.signOut).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not provision an unconfirmed email or invalid confirmation token", async () => {
    for (const verification of [{ data: { user }, error: null }, { data: { user: null }, error: { message: "expired" } }]) {
      mocks.auth.verifyOtp.mockResolvedValueOnce(verification);
      const { response, result } = makeResponse();
      await authHandler(makeRequest("POST", "/api/auth/confirm-signup", { token_hash: "signup-token" }), response);
      expect(result.statusCode).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("persists HttpOnly cookies on token verification and provisions using the same client without arguments", async () => {
    mocks.auth.verifyOtp.mockImplementation(async () => {
      setCookie(mocks.createServerClient.mock.calls[0][2]);
      return { data: { user: { ...user, email_confirmed_at: "2026-11-10T07:06:00Z" } }, error: null };
    });
    mocks.rpc.mockResolvedValueOnce({ data: { ok: true, provisioned: true }, error: null });
    const { response, headers, result } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/confirm-signup", { token_hash: "signup-token", company_id: "other", role: "super_admin" }), response);
    expect(result.statusCode).toBe(200);
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "signup-token", type: "email" });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_business_registration");
    expect(mocks.createServerClient).toHaveBeenCalledOnce();
    expect(headers.get("set-cookie")).toEqual(expect.arrayContaining([expect.stringContaining("HttpOnly"), expect.stringContaining("Secure")]));
    expect(JSON.stringify(result.body)).not.toContain("token");
  });

  it("blocks login when registration completion fails instead of silently granting access", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "provisioning failed" } });
    const { response, result } = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/login", { email: user.email, password: "example-password", captchaToken: "captcha-token" }), response);
    expect(result.statusCode).toBe(409);
    expect(mocks.auth.signOut).toHaveBeenCalledOnce();
    expect(result.body).not.toHaveProperty("user");
  });

  it("tolerates only a missing pre-migration RPC for normal/invited accounts", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    const normal = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/login", { email: user.email, password: "example-password", captchaToken: "captcha-token" }), normal.response);
    expect(normal.result.statusCode).toBe(200);
    mocks.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: { ...user, user_metadata: { tsflow_signup_intent: "business_registration" } } }, error: null });
    const pending = makeResponse();
    await authHandler(makeRequest("POST", "/api/auth/login", { email: user.email, password: "example-password", captchaToken: "captcha-token" }), pending.response);
    expect(pending.result.statusCode).toBe(409);
  });

  it("sets Secure, HttpOnly, SameSite=Lax cookies on login and never returns tokens", async () => {
    mocks.auth.signInWithPassword.mockImplementation(async () => {
      setCookie(mocks.createServerClient.mock.calls[0][2]);
      return { data: { user }, error: null };
    });
    const req = makeRequest("POST", "/api/auth/login", {
      email: user.email,
      password: "example-password",
      captchaToken: "captcha-token",
    });
    const { response, headers, result } = makeResponse();

    await authHandler(req, response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ user: { id: user.id, email: user.email, display_name: "Example User" } });
    expect(JSON.stringify(result.body)).not.toContain("access_token");
    expect(JSON.stringify(result.body)).not.toContain("refresh_token");
    const cookies = headers.get("set-cookie");
    expect(cookies).toEqual(expect.arrayContaining([
      expect.stringContaining("HttpOnly"),
      expect.stringContaining("Secure"),
      expect.stringContaining("SameSite=Lax"),
      expect.stringContaining("Path=/"),
      expect.stringMatching(/^__Host-tsflow-auth-token/),
    ]));
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: user.email,
      password: "example-password",
      options: { captchaToken: "captcha-token" },
    });
  });

  it("rejects cross-origin state changes before creating an auth client", async () => {
    const req = makeRequest("POST", "/api/auth/login", {}, { origin: "https://attacker.example" });
    const { response, result } = makeResponse();

    await authHandler(req, response);

    expect(result.statusCode).toBe(403);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("refreshes expiring sessions server-side and returns only the verified user", async () => {
    mocks.auth.getSession.mockResolvedValueOnce({
      data: { session: { ...activeSession, expires_at: 1 } },
      error: null,
    });
    mocks.auth.refreshSession.mockImplementation(async () => {
      setCookie(mocks.createServerClient.mock.calls[0][2]);
      return { data: { session: { ...activeSession, access_token: "refreshed-access-token" } }, error: null };
    });
    const req = makeRequest("GET", "/api/auth/session");
    const { response, headers, result } = makeResponse();

    await authHandler(req, response);

    expect(mocks.auth.refreshSession).toHaveBeenCalledOnce();
    expect(mocks.auth.getUser).toHaveBeenCalledWith("refreshed-access-token");
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ user: { id: user.id, email: user.email, display_name: "Example User" } });
    expect(JSON.stringify(result.body)).not.toContain("refreshed-access-token");
    expect(headers.get("set-cookie")).toEqual(expect.arrayContaining([expect.stringContaining("HttpOnly")]));
  });

  it("treats a rejected refresh as an expired unauthenticated session", async () => {
    mocks.auth.getSession.mockResolvedValueOnce({
      data: { session: { ...activeSession, expires_at: 1 } },
      error: null,
    });
    mocks.auth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { status: 400, message: "Refresh token expired" },
    });
    const { response, result } = makeResponse();

    await authHandler(makeRequest("GET", "/api/auth/session"), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ user: null });
    expect(mocks.auth.getUser).not.toHaveBeenCalled();
  });

  it("revokes the Supabase session on logout and clears its cookie", async () => {
    mocks.auth.signOut.mockImplementation(async () => {
      mocks.createServerClient.mock.calls[0][2].cookies.setAll(
        [{ name: "__Host-tsflow-auth-token.0", value: "", options: { path: "/", maxAge: 0 } }],
        {},
      );
      return { error: null };
    });
    const { response, headers, result } = makeResponse();

    await authHandler(makeRequest("POST", "/api/auth/logout"), response);

    expect(mocks.auth.signOut).toHaveBeenCalledOnce();
    expect(result.body).toEqual({ ok: true });
    expect(headers.get("set-cookie")).toEqual(expect.arrayContaining([
      expect.stringContaining("HttpOnly"),
      expect.stringContaining("Max-Age=0"),
    ]));
  });

  it("verifies invitation tokens only through the explicit server endpoint", async () => {
    mocks.auth.verifyOtp.mockImplementation(async () => {
      setCookie(mocks.createServerClient.mock.calls[0][2]);
      return { data: { user }, error: null };
    });
    const { response, result } = makeResponse();

    await authHandler(makeRequest("POST", "/api/auth/verify-invite", { token_hash: "invite-token" }), response);

    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "invite-token", type: "invite" });
    expect(result.body).toEqual({ user: { id: user.id, email: user.email, display_name: "Example User" } });
  });

  it("blocks password changes without a validated invitation session", async () => {
    mocks.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const { response, result } = makeResponse();

    await authHandler(makeRequest("POST", "/api/auth/update-password", { password: "a-secure-password" }), response);

    expect(result.statusCode).toBe(401);
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password only within the validated invitation session", async () => {
    const { response, result } = makeResponse();

    await authHandler(
      makeRequest("POST", "/api/auth/update-password", { password: "a-secure-password" }),
      response,
    );

    expect(mocks.auth.getUser).toHaveBeenCalledWith("user-access-token");
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ password: "a-secure-password" });
    expect(result.statusCode).toBe(200);
  });

  it("forwards the cookie-authenticated user token, not a browser bearer token, to Edge Functions", async () => {
    const upstreamResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const fetchMock = vi.fn().mockResolvedValue(upstreamResponse);
    vi.stubGlobal("fetch", fetchMock);
    const req = makeRequest(
      "POST",
      "/api/supabase/functions/v1/tenant-admin",
      { action: "list", company_id: "company-target" },
      { authorization: "Bearer attacker-token" },
    );
    const { response, result } = makeResponse();

    await supabaseHandler(req, response);

    const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(target.toString()).toBe("https://project.supabase.co/functions/v1/tenant-admin");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer user-access-token");
    expect(new Headers(init.headers).get("apikey")).toBe("publishable-key");
    expect(init.body).toBe(JSON.stringify({ action: "list", company_id: "company-target" }));
    expect(result.statusCode).toBe(200);
    expect([...new Headers(init.headers).values()].join(" ")).not.toContain("service_role");
  });

  it.each(["GET", "HEAD"])("rejects %s requests to Edge Functions", async (method) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { response, result } = makeResponse();

    await supabaseHandler(
      makeRequest(method, "/api/supabase/functions/v1/nrs-credentials", {}, {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
      response,
    );

    expect(result.statusCode).toBe(405);
    expect(result.getHeader("allow")).toBe("POST");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows same-origin PostgREST reads when browser Fetch Metadata is present", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));
    const req = makeRequest("GET", "/api/supabase/rest/v1/invoices");
    delete req.headers.origin;
    req.headers["sec-fetch-site"] = "same-origin";
    const { response, result } = makeResponse();

    await supabaseHandler(req, response);

    expect(result.statusCode).toBe(200);
  });

  it("rejects cross-site read-only proxy requests and requests without browser origin metadata", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const crossSite = makeResponse();
    await supabaseHandler(
      makeRequest("GET", "/api/supabase/rest/v1/invoices", {}, {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
      crossSite.response,
    );
    expect(crossSite.result.statusCode).toBe(403);

    const missingMetadataRequest = makeRequest("GET", "/api/supabase/rest/v1/invoices");
    delete missingMetadataRequest.headers.origin;
    const missingMetadata = makeResponse();
    await supabaseHandler(missingMetadataRequest, missingMetadata.response);
    expect(missingMetadata.result.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects percent-encoded proxy paths before forwarding upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { response, result } = makeResponse();

    await supabaseHandler(
      makeRequest("GET", "/api/supabase/rest/v1/%252e%252e/invoices"),
      response,
    );

    expect(result.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves backend authorization failures instead of returning success-shaped responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: false, error: "Forbidden" }),
      { status: 403, headers: { "content-type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const { response, result } = makeResponse();

    await supabaseHandler(
      makeRequest("POST", "/api/supabase/functions/v1/tenant-admin", { action: "list" }),
      response,
    );

    expect(result.statusCode).toBe(403);
    expect(Buffer.from(result.body as Buffer).toString("utf8")).toContain("Forbidden");
  });

  it("rejects cross-origin proxy mutations and expired sessions", async () => {
    const csrfResponse = makeResponse();
    await supabaseHandler(
      makeRequest(
        "POST",
        "/api/supabase/functions/v1/tenant-admin",
        {},
        { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
      ),
      csrfResponse.response,
    );
    expect(csrfResponse.result.statusCode).toBe(403);

    mocks.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const expiredResponse = makeResponse();
    await supabaseHandler(
      makeRequest("GET", "/api/supabase/rest/v1/invoices"),
      expiredResponse.response,
    );
    expect(expiredResponse.result.statusCode).toBe(401);
  });
});
