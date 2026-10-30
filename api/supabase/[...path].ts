import type { ApiHandler, ApiRequest } from "../_lib/vercel.js";
import {
  createAuthClient,
  getAuthenticatedSession,
  hasSameOrigin,
  methodNotAllowed,
  respondJson,
} from "../_lib/session.js";

const allowedMethods = new Set(["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"]);
const allowedHeaders = [
  "accept",
  "content-type",
  "content-profile",
  "accept-profile",
  "prefer",
  "range",
  "if-match",
  "if-none-match",
  "x-client-info",
  "x-upsert",
];

export const config = { maxDuration: 60 };

function getTarget(req: ApiRequest, supabaseUrl: string): URL | null {
  const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  const prefix = "/api/supabase/";
  if (!requestUrl.pathname.startsWith(prefix)) return null;

  const resource = requestUrl.pathname.slice(prefix.length);
  let decodedResource: string;
  try {
    decodedResource = decodeURIComponent(resource);
  } catch {
    return null;
  }
  if (
    decodedResource.includes("\\") ||
    decodedResource.split("/").some((part) => part === "." || part === "..") ||
    resource !== decodedResource ||
    !/^(?:rest\/v1|functions\/v1)\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/.test(resource)
  ) {
    return null;
  }

  const target = new URL(supabaseUrl);
  target.pathname = `${target.pathname.replace(/\/$/, "")}/${resource}`;
  target.search = requestUrl.search;
  return target;
}

function requestPayload(req: ApiRequest): string | Buffer | undefined {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;
  if (req.body === undefined) return undefined;
  return JSON.stringify(req.body);
}

function isSameOriginBrowserRequest(req: ApiRequest): boolean {
  const origin = req.headers.origin;
  const fetchSiteHeader = req.headers["sec-fetch-site"];
  if (Array.isArray(fetchSiteHeader) && fetchSiteHeader.length !== 1) return false;
  const fetchSite = (Array.isArray(fetchSiteHeader) ? fetchSiteHeader[0] : fetchSiteHeader)?.toLowerCase();
  if (fetchSite !== undefined && fetchSite !== "same-origin") return false;
  if (origin !== undefined) return typeof origin === "string" && hasSameOrigin(req);
  return fetchSite === "same-origin";
}

const handler: ApiHandler = async (req, res) => {
  const method = req.method ?? "";
  if (!allowedMethods.has(method)) {
    methodNotAllowed(res, [...allowedMethods].join(", "));
    return;
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    respondJson(res, 503, { error: "Supabase proxy is not configured" });
    return;
  }
  const target = getTarget(req, supabaseUrl);
  if (!target) {
    respondJson(res, 404, { error: "Supabase resource not found" });
    return;
  }
  const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  const isEdgeFunction = requestUrl.pathname.startsWith("/api/supabase/functions/v1/");
  if (isEdgeFunction && method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  if (!isSameOriginBrowserRequest(req)) {
    respondJson(res, 403, { error: "Cross-origin request rejected" });
    return;
  }

  try {
    const client = createAuthClient(req, res);
    const session = await getAuthenticatedSession(client);
    if (!session) {
      respondJson(res, 401, { error: "Authentication required" });
      return;
    }

    const headers = new Headers();
    for (const name of allowedHeaders) {
      const value = req.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }
    headers.set("apikey", publishableKey);
    headers.set("authorization", `Bearer ${session.accessToken}`);

    const upstream = await fetch(target, {
      method,
      headers,
      body: requestPayload(req),
      redirect: "manual",
    });
    for (const name of ["content-type", "content-range", "range-unit", "content-disposition", "etag"]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.status(upstream.status);
    const payload = Buffer.from(await upstream.arrayBuffer());
    res.send(payload);
  } catch (error) {
    console.error("[supabase-proxy] Authenticated request failed", error);
    respondJson(res, 502, { error: "Authenticated Supabase request failed" });
  }
};

export default handler;
