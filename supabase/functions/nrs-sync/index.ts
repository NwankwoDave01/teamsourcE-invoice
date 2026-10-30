// supabase/functions/nrs-sync/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveNrsBaseUrl } from "../_shared/nrsBaseUrl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://e-invoicing.teamsource.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Validate the caller's Supabase session before creating a privileged database client.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body: unknown = await req.json().catch(() => ({}));
    const bodyRecord = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
    let companyId = typeof bodyRecord?.company_id === "string" ? bodyRecord.company_id : "";

    if (!companyId) {
      const { data: memberships, error } = await admin
        .from("company_members")
        .select("company_id")
        .eq("user_id", authData.user.id)
        .eq("status", "Active");
      if (error) return json({ error: "Unable to resolve company membership" }, 500);
      if (!memberships?.length) return json({ error: "No active company membership" }, 403);
      if (memberships.length !== 1) return json({ error: "company_id is required for users in multiple companies" }, 400);
      companyId = memberships[0].company_id;
    }

    const { data: allowed, error: authorizationError } = await admin.rpc("can_manage_invoices", {
      _user_id: authData.user.id,
      _company_id: companyId,
    });
    if (authorizationError) {
      console.error("[NRS-SYNC] Invoice authorization check failed");
      return json({ error: "Unable to verify invoice permissions" }, 500);
    }
    if (allowed !== true) return json({ error: "Forbidden" }, 403);

    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("nrs_environment,nrs_sandbox_base_url,nrs_production_base_url")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError || !company) return json({ error: "Unable to load company NRS configuration" }, 500);

    const environment = String(company.nrs_environment ?? "").trim().toLowerCase();
    if (environment !== "sandbox" && environment !== "production") {
      return json({ error: "Company NRS environment must be sandbox or production" }, 400);
    }
    const configuredBaseUrl = environment === "production"
      ? company.nrs_production_base_url ?? ""
      : company.nrs_sandbox_base_url ?? "";
    const baseUrl = resolveNrsBaseUrl(configuredBaseUrl, environment);
    if (!baseUrl) return json({ error: "NRS base URL is not configured for this environment" }, 400);

    const { data: credentialConfig, error: credentialError } = await admin
      .from("nrs_taxpayer_credentials")
      .select("api_key_secret_id,api_secret_secret_id")
      .eq("company_id", companyId)
      .eq("environment", environment)
      .maybeSingle();
    if (credentialError) return json({ error: "Unable to load credential configuration" }, 500);
    if (!credentialConfig?.api_key_secret_id || !credentialConfig?.api_secret_secret_id) {
      return json({ error: "NRS API credentials are not configured for this company and environment" }, 400);
    }

    const { data: secrets, error: secretsError } = await admin.rpc("nrs_read_taxpayer_secrets", {
      _company_id: companyId,
      _environment: environment,
    });
    if (secretsError || !secrets?.length ||
        typeof secrets[0].api_key !== "string" || !secrets[0].api_key ||
        typeof secrets[0].api_secret !== "string" || !secrets[0].api_secret) {
      console.error("[NRS-SYNC] Stored credentials could not be retrieved");
      return json({ error: "Unable to retrieve stored NRS credentials" }, 500);
    }

    const headers = {
      "Accept": "application/json",
      "x-api-key": secrets[0].api_key,
      "x-api-secret": secrets[0].api_secret,
    };
    const endpoints = [
      { type: "currencies", path: "/api/v1/invoice/resources/currencies" },
      { type: "invoice-types", path: "/api/v1/invoice/resources/invoice-types" },
      { type: "payment-means", path: "/api/v1/invoice/resources/payment-means" },
      { type: "tax-categories", path: "/api/v1/invoice/resources/tax-categories" },
      { type: "hs-codes", path: "/api/v1/invoice/resources/hs-codes" },
      { type: "services-codes", path: "/api/v1/invoice/resources/services-codes" },
    ];

    const results: Array<Record<string, unknown>> = [];
    for (const ep of endpoints) {
      let response: Response;
      try {
        response = await fetch(baseUrl + ep.path, {
          method: "GET",
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        results.push({ type: ep.type, status: "failed", error: "NRS request timed out or could not connect" });
        continue;
      }
      if (!response.ok) {
        // Do not log upstream response bodies; they may contain sensitive details.
        results.push({ type: ep.type, status: "failed", http_status: response.status });
        continue;
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        results.push({ type: ep.type, status: "failed", error: "NRS returned invalid JSON" });
        continue;
      }
      const payloadData = payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>).data
        : null;
      const items = Array.isArray(payload) ? payload : Array.isArray(payloadData) ? payloadData : null;
      if (!items) {
        results.push({ type: ep.type, status: "failed", error: "Unexpected NRS response structure" });
        continue;
      }

      let upsertCount = 0;
      let itemFailures = 0;
      let missingCodeCount = 0;
      let databaseWriteFailureCount = 0;
      const databaseErrorCodes = new Set<string>();
      const sampleItemKeys = items.length && items[0] && typeof items[0] === "object" && !Array.isArray(items[0])
        ? Object.keys(items[0] as Record<string, unknown>).slice(0, 30)
        : [];
      const rowsToUpsert: Array<Record<string, unknown>> = [];
      for (const item of items) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          itemFailures++;
          missingCodeCount++;
          continue;
        }
        const row = item as Record<string, unknown>;
        const code = row.hscode ?? row.id ?? row.code ?? row.hsn_code ?? row.service_code;
        const label = row.description ?? row.name ?? row.product_category ?? code;
        if (code === undefined || code === null || String(code).trim() === "") {
          itemFailures++;
          missingCodeCount++;
          continue;
        }
        rowsToUpsert.push({
          resource_type: ep.type,
          code: String(code),
          label: String(label ?? code),
          metadata: row,
          updated_at: new Date().toISOString(),
        });
      }

      // Batch writes to avoid thousands of sequential database requests for large catalogues.
      // Smaller batches also limit per-request payload size and function memory pressure.
      const batchSize = ep.type === "hs-codes" ? 100 : 250;
      for (let i = 0; i < rowsToUpsert.length; i += batchSize) {
        const batch = rowsToUpsert.slice(i, i + batchSize);
        const { error } = await admin.from("nrs_master_data").upsert(batch, {
          onConflict: "resource_type, code",
        });
        if (error) {
          itemFailures += batch.length;
          databaseWriteFailureCount += batch.length;
          if (error.code) databaseErrorCodes.add(String(error.code));
        } else {
          upsertCount += batch.length;
        }
      }
      results.push({
        type: ep.type,
        status: itemFailures ? (upsertCount ? "partial" : "failed") : "success",
        count: upsertCount,
        failed_items: itemFailures,
        missing_code_count: missingCodeCount,
        database_write_failure_count: databaseWriteFailureCount,
        database_error_codes: Array.from(databaseErrorCodes).slice(0, 5),
        sample_item_keys: sampleItemKeys,
      });
    }

    const failed = results.filter((r) => r.status !== "success").length;
    return json({
      message: failed ? "NRS reference synchronization completed with errors" : "NRS reference synchronization completed successfully",
      company_id: companyId,
      environment,
      results,
      failed_resources: failed,
    }, failed ? 207 : 200);
  } catch (error) {
    console.error("[NRS-SYNC] Unexpected error", error instanceof Error ? error.message : "unknown error");
    return json({ error: "NRS synchronization failed unexpectedly" }, 500);
  }
});
