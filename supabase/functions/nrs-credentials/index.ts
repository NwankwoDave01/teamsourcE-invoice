// nrs-credentials — multi-tenant NRS taxpayer credential management.
// Secrets are stored in Supabase Vault and NEVER returned to the browser.
// Actions: status | save | verify | disconnect
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type Status = {
  api_key_configured: boolean;
  api_secret_configured: boolean;
  taxpayer_password_configured: boolean;
  verified: boolean;
  verified_at: string | null;
  last_error: string | null;
  environment: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    // 1. Identify the caller from their JWT (never trust body identity).
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 2. Resolve the caller's company from membership.
    const { data: member } = await admin
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "Active")
      .maybeSingle();
    const companyId = member?.company_id as string | undefined;
    if (!companyId) return json({ error: "No active company membership" }, 403);

    // 3. Authorize with the existing RBAC helper.
    const { data: allowed } = await admin.rpc("can_manage_invoices", {
      _user_id: user.id,
      _company_id: companyId,
    });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body?.action ?? "status");

    const { data: company } = await admin
      .from("companies")
      .select("nrs_environment, nrs_sandbox_base_url, nrs_production_base_url, nrs_taxpayer_email, nrs_portal_email")
      .eq("id", companyId)
      .maybeSingle();

    const loadStatus = async (): Promise<Status> => {
      const { data: row } = await admin
        .from("nrs_credentials")
        .select("api_key_secret_id, api_secret_secret_id, taxpayer_password_secret_id, verified, verified_at, last_verification_error")
        .eq("company_id", companyId)
        .maybeSingle();
      return {
        api_key_configured: !!row?.api_key_secret_id,
        api_secret_configured: !!row?.api_secret_secret_id,
        taxpayer_password_configured: !!row?.taxpayer_password_secret_id,
        verified: !!row?.verified,
        verified_at: row?.verified_at ?? null,
        last_error: row?.last_verification_error ?? null,
        environment: company?.nrs_environment ?? "sandbox",
      };
    };

    if (action === "status") return json(await loadStatus());

    if (!allowed) return json({ error: "Forbidden: admin or finance role required" }, 403);

    if (action === "save") {
      const kinds: Array<["api_key" | "api_secret" | "taxpayer_password", unknown]> = [
        ["api_key", body?.api_key],
        ["api_secret", body?.api_secret],
        ["taxpayer_password", body?.taxpayer_password],
      ];
      for (const [kind, value] of kinds) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        if (trimmed.length > 4096) return json({ error: `${kind} is too long` }, 400);
        const { error } = await admin.rpc("nrs_store_secret", {
          _company_id: companyId,
          _kind: kind,
          _value: trimmed,
        });
        if (error) return json({ error: "Failed to store credential" }, 500);
      }
      return json(await loadStatus());
    }

    if (action === "disconnect") {
      const { error } = await admin.rpc("nrs_delete_secrets", { _company_id: companyId });
      if (error) return json({ error: "Failed to remove credentials" }, 500);
      return json(await loadStatus());
    }

    if (action === "verify") {
      const { data: secrets } = await admin.rpc("nrs_read_secrets", { _company_id: companyId });
      const s = Array.isArray(secrets) ? secrets[0] : secrets;
      const email = company?.nrs_taxpayer_email ?? company?.nrs_portal_email ?? "";
      const missing: string[] = [];
      if (!s?.api_key) missing.push("API key");
      if (!s?.api_secret) missing.push("API secret");
      if (!s?.taxpayer_password) missing.push("taxpayer password");
      if (!email) missing.push("taxpayer email");
      if (missing.length) {
        const msg = `Missing: ${missing.join(", ")}`;
        await admin.rpc("nrs_set_verification", { _company_id: companyId, _verified: false, _error: msg });
        return json({ ...(await loadStatus()), ok: false, message: msg }, 200);
      }

      const env = company?.nrs_environment ?? "sandbox";
      const base = (env === "production"
        ? company?.nrs_production_base_url || "https://einvoice.nrs.gov.ng"
        : company?.nrs_sandbox_base_url || "https://einvoice-sandbox.nrs.gov.ng"
      ).replace(/\/+$/, "");

      let ok = false;
      let message = "";
      try {
        const res = await fetch(`${base}/api/v1/utilities/authenticate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": s.api_key,
            "x-api-secret": s.api_secret,
          },
          body: JSON.stringify({ email, password: s.taxpayer_password }),
        });
        ok = res.ok;
        message = ok
          ? "Authenticated with NRS"
          : `NRS rejected the credentials (HTTP ${res.status})`;
      } catch (_e) {
        ok = false;
        message = "Could not reach the NRS gateway";
      }

      await admin.rpc("nrs_set_verification", {
        _company_id: companyId,
        _verified: ok,
        _error: ok ? null : message,
      });
      return json({ ...(await loadStatus()), ok, message });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (_e) {
    return json({ error: "Unexpected error" }, 500);
  }
});
