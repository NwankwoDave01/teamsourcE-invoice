export const auditCategories = [
  "Invoice",
  "Customer",
  "Product",
  "User",
  "Settings",
  "Auth",
] as const;

export type AuditCategory = (typeof auditCategories)[number];

export type AuditLogRecord = {
  company_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target: string | null;
  category: AuditCategory;
  ip: null;
};

export type AuditLogDependencies = {
  authenticate: (token: string) => Promise<string | null>;
  isActiveMember: (userId: string, companyId: string) => Promise<boolean>;
  getActorName: (userId: string) => Promise<string | null>;
  insert: (record: AuditLogRecord) => Promise<void>;
};

const companyIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categorySet = new Set<string>(auditCategories);
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://e-invoicing.teamsource.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

export function createAuditLogHandler(dependencies: AuditLogDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return json({ ok: false, error: "Unauthorized" }, 401);

    let actorId: string | null;
    try {
      actorId = await dependencies.authenticate(token);
    } catch {
      console.error("[AUDIT-LOG] Authentication service failed");
      return json({ ok: false, error: "Unable to verify authentication" }, 500);
    }
    if (!actorId) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Request body must be valid JSON" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ ok: false, error: "A valid audit event is required" }, 400);
    }

    const input = body as Record<string, unknown>;
    const companyId = typeof input.company_id === "string" ? input.company_id : "";
    if (!companyIdPattern.test(companyId)) {
      return json({ ok: false, error: "A valid company ID is required" }, 400);
    }

    const action = typeof input.action === "string" ? input.action.trim() : "";
    if (!action || action.length > 200) {
      return json({ ok: false, error: "Action must be between 1 and 200 characters" }, 400);
    }

    if (typeof input.category !== "string" || !categorySet.has(input.category)) {
      return json({ ok: false, error: "A supported audit category is required" }, 400);
    }

    let target: string | null = null;
    if (input.target !== undefined && input.target !== null) {
      if (typeof input.target !== "string") {
        return json({ ok: false, error: "Target must be text or null" }, 400);
      }
      target = input.target.trim();
      if (!target || target.length > 200) {
        return json({ ok: false, error: "Target must be between 1 and 200 characters" }, 400);
      }
    }

    try {
      if (!(await dependencies.isActiveMember(actorId, companyId))) {
        return json({ ok: false, error: "Active company membership is required" }, 403);
      }

      const profileName = await dependencies.getActorName(actorId);
      const actorName = profileName?.trim().slice(0, 120) || "User";
      await dependencies.insert({
        company_id: companyId,
        actor_id: actorId,
        actor_name: actorName,
        action,
        target,
        category: input.category as AuditCategory,
        ip: null,
      });
      return json({ ok: true });
    } catch {
      console.error("[AUDIT-LOG] Audit event could not be recorded");
      return json({ ok: false, error: "Unable to record audit event" }, 500);
    }
  };
}
