import { createClient } from "npm:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import { resolveNrsBaseUrl } from "../_shared/nrsBaseUrl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://e-invoicing.teamsource.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",

  "Vary": "Origin",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function authenticateUser(req: Request) {
  const h = req.headers.get("Authorization") ?? "";
  if (!h.startsWith("Bearer ")) throw new Error("Unauthorized");
  const c = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: h } },
  });
  const { data, error } = await c.auth.getUser(h.slice(7));
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

async function getCompanyId(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "Active");
  if (error || !data?.length) throw new Error("No active company membership");
  if (data.length > 1) {
    throw new Error("company_id is required when the user belongs to multiple companies");
  }
  return data[0].company_id;
}

async function getStatus(admin: ReturnType<typeof createClient>, companyId: string) {
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("nrs_environment,nrs_sandbox_base_url,nrs_production_base_url,nrs_business_id,nrs_service_id")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError || !company) throw new Error("Unable to load company NRS settings");

  const environment = company.nrs_environment === "production" ? "production" : "sandbox";
  const { data: creds, error: credsError } = await admin
    .from("nrs_taxpayer_credentials")
    .select("api_key_secret_id,api_secret_secret_id,verified,verified_at,last_verification_error")
    .eq("company_id", companyId)
    .eq("environment", environment)
    .maybeSingle();
  if (credsError) throw new Error("Unable to load taxpayer credential status");

  const { data: crypto, error: cryptoError } = await admin
    .from("nrs_taxpayer_crypto")
    .select("environment,active,verified_at,validation_status,validation_error,validated_at")
    .eq("company_id", companyId)
    .eq("environment", environment)
    .eq("active", true)
    .maybeSingle();
  if (cryptoError) throw new Error("Unable to load taxpayer cryptographic status");

  const baseUrl = environment === "production"
    ? company.nrs_production_base_url
    : company.nrs_sandbox_base_url;
  const businessConfigured = !!String(company.nrs_business_id ?? "").trim();
  const serviceConfigured = /^[A-Za-z0-9]{8}$/.test(String(company.nrs_service_id ?? "").trim());
  const apiKeyConfigured = !!creds?.api_key_secret_id;
  const apiSecretConfigured = !!creds?.api_secret_secret_id;
  const cryptoConfigured = !!crypto;
  const ready = businessConfigured && serviceConfigured && apiKeyConfigured &&
    apiSecretConfigured && !!String(baseUrl ?? "").trim() && cryptoConfigured;

  const credentialConfigured = apiKeyConfigured && apiSecretConfigured;
  const connectionStatus = statusLabel(
    !!String(baseUrl ?? "").trim() && credentialConfigured,
    !!creds?.verified,
    creds?.last_verification_error ?? null,
  );

  return {
    environment,
    connection_status: connectionStatus,
    connection_verified_scope: creds?.verified ? "read_only_reference_data" : null,
    base_url_configured: !!String(baseUrl ?? "").trim(),
    business_id_configured: businessConfigured,
    service_id_configured: serviceConfigured,
    api_key_configured: apiKeyConfigured,
    api_secret_configured: apiSecretConfigured,
    credentials_verified: !!creds?.verified,
    crypto_configured: cryptoConfigured,
    crypto_status: !cryptoConfigured ? "not_configured" : crypto?.verified_at ? "verified" : crypto?.validation_status === "invalid_format" ? "failed" : crypto?.validation_status === "format_valid" ? "format_valid" : "unverified",
    crypto_validation_status: crypto?.validation_status ?? (cryptoConfigured ? "unverified" : "not_configured"),
    crypto_validation_error: crypto?.validation_error ?? null,
    crypto_validated_at: crypto?.validated_at ?? null,
    crypto_environment: crypto?.environment ?? null,
    crypto_verified_at: crypto?.verified_at ?? null,
    ready,
    verified_at: creds?.verified_at ?? null,
    last_error: creds?.last_verification_error ?? null,
  };
}



function decodeBase64Text(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (!cleaned || cleaned.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return null;
  try {
    const binary = atob(cleaned);
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (ch) => ch.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}

function inspectCryptoMaterial(publicKeyInput: string, certificateInput: string) {
  const rawKey = publicKeyInput.trim();
  const decodedKey = rawKey.includes("-----BEGIN") ? rawKey : decodeBase64Text(rawKey);
  if (!decodedKey) {
    return { status: "invalid_format", error: "Public key is not valid PEM or Base64-encoded PEM." };
  }
  const normalizedKey = decodedKey.replace(/\r\n/g, "\n").trim();
  let publicKey: ReturnType<typeof forge.pki.publicKeyFromPem>;
  try {
    publicKey = forge.pki.publicKeyFromPem(normalizedKey);
  } catch {
    return { status: "invalid_format", error: "Public key could not be parsed by the cryptographic library used by invoice submission." };
  }

  // Perform a local throwaway encryption to confirm the key can execute the
  // same RSA PKCS#1 v1.5 operation used by the current QR-generation code.
  try {
    const probe = JSON.stringify({ check: "local-crypto-compatibility" });
    const encrypted = publicKey.encrypt(forge.util.encodeUtf8(probe), "RSAES-PKCS1-V1_5");
    if (!encrypted || encrypted.length < 64) {
      return { status: "invalid_format", error: "Public key parsed but could not complete the expected RSA encryption operation." };
    }
  } catch {
    return { status: "invalid_format", error: "Public key cannot perform the RSA encryption operation required by QR generation." };
  }

  const certificate = certificateInput.trim();
  const hasDisallowedControl = [...certificate].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f);
  });
  if (!certificate || certificate.length > 20000 || hasDisallowedControl) {
    return { status: "invalid_format", error: "Certificate value is empty, too long, or contains invalid control characters." };
  }
  return { status: "format_valid", error: null };
}

function statusLabel(configured: boolean, verified: boolean, lastError: string | null) {
  if (!configured) return "not_configured";
  if (verified) return "verified";
  if (!lastError) return "configured";
  return lastError.startsWith("NRS rejected") ? "failed" : "unverified";
}

async function recordCredentialVerification(
  admin: ReturnType<typeof createClient>,
  companyId: string,
  environment: string,
  verified: boolean,
  errorMessage: string | null,
) {
  const { error } = await admin.from("nrs_taxpayer_credentials").update({
    verified,
    verified_at: verified ? new Date().toISOString() : null,
    last_verification_error: verified ? null : errorMessage,
    updated_at: new Date().toISOString(),
  }).eq("company_id", companyId).eq("environment", environment);
  if (error) throw new Error("Unable to save NRS verification result");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticateUser(req);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const companyId = await getCompanyId(admin, user.id);
    const { data: canManageCompany, error: roleCheckError } = await admin.rpc("can_manage_company", {
      _user_id: user.id,
      _company_id: companyId,
    });
    if (roleCheckError) return json({ error: "Unable to verify company permissions" }, 500);
    if (canManageCompany !== true) return json({ error: "Forbidden: company administrator role required" }, 403);
    const action = String(body?.action ?? "status");

    if (action === "status") return json(await getStatus(admin, companyId));

    if (action === "verify") {
      const { data: company, error: companyError } = await admin
        .from("companies")
        .select("nrs_environment,nrs_sandbox_base_url,nrs_production_base_url")
        .eq("id", companyId).single();
      if (companyError || !company) throw new Error("Unable to load company NRS settings");
      const environment = company.nrs_environment === "production" ? "production" : "sandbox";
      const configuredBaseUrl = environment === "production"
        ? company.nrs_production_base_url ?? "" : company.nrs_sandbox_base_url ?? "";
      const baseUrl = resolveNrsBaseUrl(configuredBaseUrl, environment);
      if (!baseUrl) return json({
        connection_status: "not_configured", verified: false,
        check: "read_only_reference_data",
        message: "The configured NRS base URL is missing or not an approved HTTPS origin for this environment.",
      }, 400);

      const { data: credentialRow, error: credentialError } = await admin
        .from("nrs_taxpayer_credentials")
        .select("api_key_secret_id,api_secret_secret_id")
        .eq("company_id", companyId).eq("environment", environment).maybeSingle();
      if (credentialError) throw new Error("Unable to load taxpayer credential configuration");
      if (!credentialRow?.api_key_secret_id || !credentialRow?.api_secret_secret_id) {
        return json({
          connection_status: "not_configured", verified: false,
          check: "read_only_reference_data",
          message: "Both API key and API secret must be configured before verification.",
        }, 400);
      }
      const { data: secretRows, error: secretsError } = await admin.rpc("nrs_read_taxpayer_secrets", {
        _company_id: companyId, _environment: environment,
      });
      if (secretsError || !secretRows?.length ||
          typeof secretRows[0].api_key !== "string" ||
          typeof secretRows[0].api_secret !== "string") {
        throw new Error("Unable to retrieve stored NRS credentials securely");
      }

      let response: Response;
      try {
        response = await fetch(baseUrl + "/api/v1/invoice/resources/currencies", {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "x-api-key": secretRows[0].api_key,
            "x-api-secret": secretRows[0].api_secret,
          },
          redirect: "error",
          signal: AbortSignal.timeout(12000),
        });
      } catch (err) {
        const detail = err instanceof Error && err.name === "TimeoutError"
          ? "The NRS verification request timed out."
          : "Could not reach the configured NRS endpoint.";
        await recordCredentialVerification(admin, companyId, environment, false, detail);
        return json({
          connection_status: "unverified", verified: false,
          check: "read_only_reference_data",
          message: detail + " This does not prove the credentials are invalid; retry when the endpoint is reachable.",
        }, 502);
      }
      const responseText = await response.text();
      let payload: unknown = null;
      try { payload = responseText ? JSON.parse(responseText) : null; } catch { /* non-JSON response */ }
      const payloadObject = payload !== null && typeof payload === "object"
        ? payload as Record<string, unknown>
        : null;
      const appCode = payloadObject?.code;
      const success = response.ok &&
        (appCode === undefined || appCode === 200 || appCode === "200") &&
        (payload === null || typeof payload === "object");
      if (success) {
        const verifiedAt = new Date().toISOString();
        await recordCredentialVerification(admin, companyId, environment, true, null);
        return json({
          connection_status: "verified", verified: true,
          check: "read_only_reference_data", verified_at: verifiedAt, environment,
          message: "NRS accepted the stored API credentials for a read-only currencies request. This does not verify signing, certificate acceptance, invoice submission, or QR generation.",
        });
      }
      const authFailure = response.status === 401 || response.status === 403;
      const failureMessage = authFailure
        ? "NRS rejected the stored API credentials or their access permissions."
        : "NRS did not return a successful response to the read-only currencies request.";
      await recordCredentialVerification(admin, companyId, environment, false, failureMessage);
      return json({
        connection_status: authFailure ? "failed" : "unverified",
        verified: false, check: "read_only_reference_data",
        http_status: response.status, message: failureMessage,
        nrs_message: typeof payloadObject?.message === "string" ? payloadObject.message.slice(0, 300) : null,
      }, authFailure ? 400 : 502);
    }


    if (action === "save") {
      const { data: company, error: companyError } = await admin
        .from("companies").select("nrs_environment").eq("id", companyId).single();
      if (companyError || !company) throw new Error("Unable to load company environment");
      const environment = company.nrs_environment === "production" ? "production" : "sandbox";
      const apiKey = typeof body?.api_key === "string" ? body.api_key.trim() : "";
      const apiSecret = typeof body?.api_secret === "string" ? body.api_secret.trim() : "";
      if (!apiKey && !apiSecret) return json({ error: "Provide an API key, API secret, or both." }, 400);

      if (apiKey) {
        if (apiKey.length > 4096) return json({ error: "API key is too long" }, 400);
        const { error } = await admin.rpc("nrs_store_taxpayer_secret", {
          _company_id: companyId, _environment: environment, _kind: "api_key", _value: apiKey,
        });
        if (error) {
          console.error("NRS taxpayer API key storage failed", error.message);
          return json({ error: "Failed to store taxpayer API key" }, 500);
        }
      }
      if (apiSecret) {
        if (apiSecret.length > 4096) return json({ error: "API secret is too long" }, 400);
        const { error } = await admin.rpc("nrs_store_taxpayer_secret", {
          _company_id: companyId, _environment: environment, _kind: "api_secret", _value: apiSecret,
        });
        if (error) {
          console.error("NRS taxpayer API secret storage failed", error.message);
          return json({ error: "Failed to store taxpayer API secret" }, 500);
        }
      }
      return json(await getStatus(admin, companyId));
    }

    if (action === "save_crypto") {
      const { data: company, error: companyError } = await admin
        .from("companies").select("nrs_environment").eq("id", companyId).single();
      if (companyError || !company) throw new Error("Unable to load company environment");
      const environment = company.nrs_environment === "production" ? "production" : "sandbox";
      let public_key = typeof body?.public_key === "string" ? body.public_key.trim() : "";
      let certificate = typeof body?.certificate === "string" ? body.certificate.trim() : "";
      if (typeof body?.crypto_keys === "string" && body.crypto_keys.trim()) {
        try {
          const parsed = JSON.parse(body.crypto_keys.replace(/^\uFEFF/, "").trim());
          public_key = typeof parsed?.public_key === "string" ? parsed.public_key.trim() : "";
          certificate = typeof parsed?.certificate === "string" ? parsed.certificate.trim() : "";
        } catch {
          return json({ error: "crypto_keys must be valid JSON from crypto_keys.txt" }, 400);
        }
      }
      if (!public_key || !certificate) {
        return json({ error: "Provide crypto_keys or both public_key and certificate" }, 400);
      }
      if (public_key.length > 20000 || certificate.length > 20000) {
        return json({ error: "Crypto material is too large" }, 400);
      }
      const inspected = inspectCryptoMaterial(public_key, certificate);
      const { error } = await admin.from("nrs_taxpayer_crypto").upsert({
        company_id: companyId, environment, public_key, certificate,
        active: true, verified_at: null, validation_status: inspected.status,
        validation_error: inspected.error, validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,environment" });
      if (error) {
        console.error("NRS crypto configuration storage failed", error.message);
        return json({ error: "Failed to store taxpayer crypto configuration" }, 500);
      }
      return json(await getStatus(admin, companyId));
    }


    if (action === "validate_crypto") {
      const { data: company, error: companyError } = await admin
        .from("companies").select("nrs_environment").eq("id", companyId).single();
      if (companyError || !company) throw new Error("Unable to load company environment");
      const environment = company.nrs_environment === "production" ? "production" : "sandbox";
      const { data: crypto, error: cryptoError } = await admin
        .from("nrs_taxpayer_crypto")
        .select("public_key,certificate,active")
        .eq("company_id", companyId).eq("environment", environment).eq("active", true)
        .maybeSingle();
      if (cryptoError) throw new Error("Unable to load taxpayer cryptographic configuration");
      if (!crypto) return json({
        crypto_status: "not_configured",
        crypto_validation_status: "not_configured",
        message: "No active certificate/public-key material is saved for this environment.",
      }, 400);
      const inspected = inspectCryptoMaterial(String(crypto.public_key ?? ""), String(crypto.certificate ?? ""));
      const now = new Date().toISOString();
      const { error: updateError } = await admin.from("nrs_taxpayer_crypto").update({
        validation_status: inspected.status,
        validation_error: inspected.error,
        validated_at: now,
        verified_at: null,
        updated_at: now,
      }).eq("company_id", companyId).eq("environment", environment);
      if (updateError) throw new Error("Unable to save cryptographic validation result");
      return json({
        environment,
        crypto_status: inspected.status === "invalid_format" ? "failed" : "format_valid",
        crypto_validation_status: inspected.status,
        validated_at: now,
        nrs_accepted: false,
        message: inspected.status === "format_valid"
          ? "The saved public key has a PEM structure with a Base64 body, and the certificate value passed basic format checks. This is a local format check only; NRS acceptance, key matching, certificate validity, and signing are not verified."
          : inspected.error,
      }, inspected.status === "invalid_format" ? 400 : 200);
    }

    if (action === "disconnect") {
      const { error: taxpayerError } = await admin.rpc("nrs_delete_taxpayer_credentials", {
        _company_id: companyId,
      });
      if (taxpayerError) {
        console.error("Taxpayer credential cleanup failed", taxpayerError.message);
        return json({ error: "Failed to remove taxpayer NRS credentials" }, 500);
      }
      // Remove legacy credentials only as part of an explicit disconnect action.
      const { error: legacyError } = await admin.rpc("nrs_delete_credentials", {
        p_company_id: companyId,
      });
      if (legacyError) {
        console.error("Legacy credential cleanup failed", legacyError.message);
        return json({ error: "Taxpayer credentials removed, but legacy cleanup failed" }, 500);
      }
      const { error: cryptoError } = await admin
        .from("nrs_taxpayer_crypto").delete().eq("company_id", companyId);
      if (cryptoError) {
        console.error("Crypto configuration cleanup failed", cryptoError.message);
        return json({ error: "Credentials removed but crypto cleanup failed" }, 500);
      }
      return json(await getStatus(admin, companyId));
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: message }, status);
  }
});