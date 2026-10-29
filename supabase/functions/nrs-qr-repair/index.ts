import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import forge from "npm:node-forge@1.3.1";
import QRCode from "npm:qrcode@1.5.4";

const headers = {
  "Access-Control-Allow-Origin": "https://e-invoicing.teamsource.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function publicPem(value: string): string {
  const input = String(value ?? "").trim();
  if (input.includes("-----BEGIN PUBLIC KEY-----")) return input;
  const normalized = input.replace(/\s+/g, "");
  const decoded = atob(normalized);
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(decoded, (c) => c.charCodeAt(0)),
  ).trim();
}

async function generateQr(irn: string, certificate: string, publicKeyValue: string) {
  // NRS QR payload: IRN + Unix-seconds timestamp and certificate, encrypted
  // with taxpayer RSA public key using PKCS#1 v1.5, then Base64-encoded.
  // Timestamp is generated here at processing time, matching the documented package behavior.
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ irn: `${irn}.${timestamp}`, certificate });
  const publicKey = forge.pki.publicKeyFromPem(publicPem(publicKeyValue));
  const encrypted = publicKey.encrypt(forge.util.encodeUtf8(payload), "RSAES-PKCS1-V1_5");
  const encryptedBase64 = btoa(encrypted);
  const qrCodeDataUrl = await QRCode.toDataURL(encryptedBase64, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
  return { encryptedBase64, qrCodeDataUrl };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ ok: false, error: "Server configuration is incomplete" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await request.json().catch(() => ({}));
    const invoiceId = typeof body?.invoice_id === "string" ? body.invoice_id.trim() : "";
    if (!invoiceId) return json({ ok: false, error: "invoice_id is required" }, 400);
    if (body?.confirm_regenerate !== true) {
      return json({ ok: false, error: "Set confirm_regenerate=true to regenerate QR for an already-signed sandbox invoice" }, 400);
    }

    const db = createClient(supabaseUrl, serviceRoleKey);
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select("id,company_id,irn,status,submission_status,nrs_signed_at,qr_code,qr_code_data")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invoiceError) throw new Error("Unable to load invoice");
    if (!invoice) return json({ ok: false, error: "Invoice not found or unavailable" }, 404);

    const { data: allowed, error: permissionError } = await db.rpc("can_manage_invoices", {
      _user_id: user.id,
      _company_id: invoice.company_id,
    });
    if (permissionError) {
      console.error("NRS_QR_REPAIR_AUTHORIZATION_CHECK_FAILED", {
        error_code: permissionError.code ?? "unknown",
      });
      return json({ ok: false, error: "Invoice not found or unavailable" }, 404);
    }
    if (!allowed) return json({ ok: false, error: "Invoice not found or unavailable" }, 404);

    // This repair endpoint is deliberately sandbox-only and never submits/signs/contacts NRS.
    const { data: company, error: companyError } = await db
      .from("companies")
      .select("nrs_environment")
      .eq("id", invoice.company_id)
      .maybeSingle();
    if (companyError || !company) throw new Error("Unable to load company environment");
    if (String(company.nrs_environment ?? "").toLowerCase() !== "sandbox") {
      return json({ ok: false, error: "QR repair is restricted to the sandbox environment" }, 409);
    }

    const isSigned = String(invoice.status ?? "").toLowerCase() === "signed" ||
      String(invoice.submission_status ?? "").toLowerCase() === "signed";
    if (!isSigned || !invoice.irn || !invoice.nrs_signed_at) {
      return json({
        ok: false,
        error: "Invoice must already have a saved IRN, signed status, and NRS signed timestamp. No invoice state was changed.",
      }, 409);
    }

    const { data: crypto, error: cryptoError } = await db
      .from("nrs_taxpayer_crypto")
      .select("public_key,certificate")
      .eq("company_id", invoice.company_id)
      .eq("environment", "sandbox")
      .eq("active", true)
      .maybeSingle();
    if (cryptoError || !crypto?.public_key || !crypto?.certificate) {
      return json({ ok: false, error: "Active sandbox public key and certificate are required" }, 422);
    }

    let generated: { encryptedBase64: string; qrCodeDataUrl: string };
    try {
      generated = await generateQr(String(invoice.irn), String(crypto.certificate), String(crypto.public_key));
    } catch (error) {
      // Do not log or return key/certificate/payload. Invoice state remains untouched.
      console.error("NRS QR regeneration failed", {
        invoice_id: invoiceId,
        stage: "generate_qr",
        error_type: error instanceof Error ? error.name : "unknown",
      });
      return json({ ok: false, stage: "generate_qr", error: "QR generation failed. No invoice state was changed." }, 422);
    }

    // Update QR artifacts only. Status, IRN, CSID, signed timestamps and NRS response remain unchanged.
    const { error: updateError } = await db.from("invoices").update({
      qr_code_data: generated.encryptedBase64,
      qr_code: generated.qrCodeDataUrl,
    }).eq("id", invoiceId);
    if (updateError) {
      console.error("NRS QR regeneration persistence failed", { invoice_id: invoiceId });
      return json({ ok: false, stage: "persist_qr", error: "QR was generated but could not be saved. Invoice signing state was not changed." }, 500);
    }

    return json({
      ok: true,
      environment: "sandbox",
      invoice_id: invoiceId,
      irn: invoice.irn,
      qr_regenerated: true,
      signed_state_preserved: true,
      nrs_request_made: false,
      message: "QR artifacts regenerated and saved. No NRS submission, signing, or confirmation request was made.",
    });
  } catch (error) {
    console.error("NRS QR repair request failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "QR repair failed. No NRS submission or signing request was made." }, 500);
  }
});
