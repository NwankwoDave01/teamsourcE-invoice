import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import type { ApiRequest, ApiResponse } from "./vercel.js";

const isProduction = () => process.env.NODE_ENV === "production";

export function setPrivateResponseHeaders(res: ApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie, Origin");
}

export function createAuthClient(req: ApiRequest, res: ApiResponse) {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Server-only Supabase URL and publishable key are required");
  }

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  };
  const cookieName = isProduction() ? "__Host-tsflow-auth-token" : "tsflow-auth-token";

  return createServerClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
    cookieOptions: { ...cookieOptions, name: cookieName },
    cookies: {
      getAll() {
        const requestCookies = req.cookies ?? parse(req.headers.cookie ?? "");
        return Object.entries(requestCookies).flatMap(([name, value]) =>
          typeof value === "string" ? [{ name, value }] : [],
        );
      },
      setAll(cookies, headers) {
        const existing = res.getHeader("Set-Cookie");
        const setCookies = Array.isArray(existing)
          ? existing.map(String)
          : existing
            ? [String(existing)]
            : [];
        for (const { name, value, options } of cookies) {
          setCookies.push(serialize(name, value, {
            ...options,
            httpOnly: true,
            secure: isProduction(),
            sameSite: "lax",
            path: "/",
            domain: undefined,
          }));
        }
        if (setCookies.length) res.setHeader("Set-Cookie", setCookies);
        for (const [name, value] of Object.entries(headers)) {
          res.setHeader(name, value);
        }
        setPrivateResponseHeaders(res);
      },
    },
  });
}

export function hasSameOrigin(req: ApiRequest): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)
    ?.split(",")[0]
    ?.trim() ?? (isProduction() ? "https" : "http");

  if (typeof origin !== "string" || typeof host !== "string") return false;
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export async function getAuthenticatedSession(client: ReturnType<typeof createAuthClient>) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  let session = sessionData.session;
  if (!session) return null;

  if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
    const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      if (refreshError && refreshError.status !== 400 && refreshError.status !== 401) throw refreshError;
      return null;
    }
    session = refreshed.session;
  }

  const { data: userData, error: userError } = await client.auth.getUser(session.access_token);
  if (userError || !userData.user) {
    if (userError && userError.status !== 401) throw userError;
    return null;
  }

  return { user: userData.user, accessToken: session.access_token };
}

export function respondJson(res: ApiResponse, status: number, body: unknown) {
  setPrivateResponseHeaders(res);
  res.status(status).json(body);
}

export function methodNotAllowed(res: ApiResponse, allowed: string) {
  res.setHeader("Allow", allowed);
  respondJson(res, 405, { error: "Method not allowed" });
}
