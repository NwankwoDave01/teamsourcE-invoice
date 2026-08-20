// NRS submission edge function — supports mock / sandbox / production environments.
// Credentials are per-company and Vault-backed: they are read server-side via the
// `nrs_read_secrets` database helper and are NEVER logged or returned to clients.
// All NRS HTTP calls happen here, never in the browser.

// @ts-ignore deno remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const NRS_AUTHENTICATE_PATH = "/api/v1/utilities/authenticate";
const NRS_VALIDATE_PATH = "/api/v1/invoice/validate";
const NRS_SIGN_PATH = "/api/v1/invoice/sign";
const NRS_TRANSMIT_PATH = "/api/v1/invoice/transmit";
const INVOICE_TYPE_CODE: Record<string, string> = {
  commercial: "396",
  credit_note: "381",
  debit_note: "383",
  corrected: "384",
  proforma: "325",
};
const TAX_CATEGORY_ID: Record<string, string> = {
  S: "STANDARD_VAT",
  Z: "ZERO_RATED",
  E: "VAT_EXEMPT",
  O: "OUT_OF_SCOPE",
};

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

interface NrsCredentials {
  apiKey: string;
  apiSecret: string;
  taxpayerEmail: string;
  taxpayerPassword: string;
}

async function loadNrsCredentials(admin: any, companyId: string, company: any): Promise<NrsCredentials> {
  const { data, error } = await admin.rpc("nrs_read_secrets", { _company_id: companyId });
  if (error) throw new Error("Unable to read NRS credentials for this company");
  const s = Array.isArray(data) ? data[0] : data;
  const creds: NrsCredentials = {
    apiKey: String(s?.api_key ?? "").trim(),
    apiSecret: String(s?.api_secret ?? "").trim(),
    taxpayerPassword: String(s?.taxpayer_password ?? "").trim(),
    taxpayerEmail: String(company?.nrs_taxpayer_email ?? company?.nrs_portal_email ?? "").trim(),
  };
  const missing: string[] = [];
  if (!creds.apiKey) missing.push("API key");
  if (!creds.apiSecret) missing.push("API secret");
  if (!creds.taxpayerPassword) missing.push("taxpayer password");
  if (!creds.taxpayerEmail) missing.push("taxpayer email");
  if (missing.length) {
    throw new Error(`NRS credentials are not configured: missing ${missing.join(", ")}`);
  }
  return creds;
}

function omitEmpty(value: any): any {
  if (Array.isArray(value)) {
    return value.map(omitEmpty).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => [key, omitEmpty(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined);
    return Object.fromEntries(entries);
  }

  return value === null || value === undefined || value === "" ? undefined : value;
}

function getNrsBaseUrl(company: any, environment: string): string {
  const configured = environment === "production"
    ? company?.nrs_production_base_url
    : company?.nrs_sandbox_base_url;
  const baseUrl = String(configured ?? "").trim();
  if (!baseUrl) {
    throw new Error(`NRS ${environment} base URL is required`);
  }
  return baseUrl;
}

async function readResponseBody(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function authenticateNrsTaxpayer(baseUrl: string, credentials: NrsCredentials) {
  const authEndpoint = joinUrl(baseUrl, NRS_AUTHENTICATE_PATH);

  const authRes = await fetch(authEndpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-api-key": credentials.apiKey,
      "x-api-secret": credentials.apiSecret,
    },
    body: JSON.stringify({
      email: credentials.taxpayerEmail,
      password: credentials.taxpayerPassword,
    }),
  });
  const authBody = await readResponseBody(authRes);

  if (!authRes.ok) {
    throw new Error(`NRS taxpayer authentication failed with HTTP ${authRes.status}`);
  }

  return authBody;
}

async function validateNrsInvoice(baseUrl: string, credentials: NrsCredentials, payload: any) {
  const validateEndpoint = joinUrl(baseUrl, NRS_VALIDATE_PATH);

  const validateRes = await fetch(validateEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": credentials.apiKey,
      "x-api-secret": credentials.apiSecret,
    },
    body: JSON.stringify(payload),
  });
  const responseBody = await readResponseBody(validateRes);

  if (!validateRes.ok) {
    const failedResponse = typeof responseBody === "object" && responseBody !== null
      ? responseBody
      : { message: `NRS validation failed with HTTP ${validateRes.status}` };
    return {
      httpStatus: validateRes.status,
      response: {
        ...failedResponse,
        status: false,
        message: failedResponse.message ?? `NRS validation failed with HTTP ${validateRes.status}`,
      },
    };
  }

  return {
    httpStatus: validateRes.status,
    response: responseBody ?? { status: true, message: "NRS validation successful" },
  };
}

async function signNrsInvoice(baseUrl: string, credentials: NrsCredentials, payload: any) {
  const signEndpoint = joinUrl(baseUrl, NRS_SIGN_PATH);

  const signRes = await fetch(signEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": credentials.apiKey,
      "x-api-secret": credentials.apiSecret,
    },
    body: JSON.stringify(payload),
  });
  const responseBody = await readResponseBody(signRes);

  if (!signRes.ok) {
    const failedResponse = typeof responseBody === "object" && responseBody !== null
      ? responseBody
      : { message: `NRS signing failed with HTTP ${signRes.status}` };
    return {
      ok: false,
      status: signRes.status,
      message: failedResponse.message ?? `NRS signing failed with HTTP ${signRes.status}`,
      response: {
        ...failedResponse,
        status: false,
        message: failedResponse.message ?? `NRS signing failed with HTTP ${signRes.status}`,
      },
    };
  }

  return {
    ok: true,
    status: signRes.status,
    data: responseBody,
  };
}

async function transmitNrsInvoice(baseUrl: string, credentials: NrsCredentials, irn: string, payload: any) {
  const transmitEndpoint = joinUrl(baseUrl, `${NRS_TRANSMIT_PATH}/${encodeURIComponent(irn)}`);

  const transmitRes = await fetch(transmitEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": credentials.apiKey,
      "x-api-secret": credentials.apiSecret,
    },
    body: JSON.stringify(payload),
  });
  const responseBody = await readResponseBody(transmitRes);

  if (!transmitRes.ok) {
    const failedResponse = typeof responseBody === "object" && responseBody !== null
      ? responseBody
      : { message: `NRS transmission failed with HTTP ${transmitRes.status}` };
    return {
      ok: false,
      status: transmitRes.status,
      message: failedResponse.message ?? `NRS transmission failed with HTTP ${transmitRes.status}`,
      response: {
        ...failedResponse,
        status: false,
        message: failedResponse.message ?? `NRS transmission failed with HTTP ${transmitRes.status}`,
      },
    };
  }

  return {
    ok: true,
    status: transmitRes.status,
    data: responseBody,
  };
}

function buildIrn(invoiceNumber: string, serviceId: string | null | undefined, issueDate: string): string {
  const inv = (invoiceNumber ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "INV";
  const svc = (serviceId ?? "MOCKSVC").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "MOCKSVC";
  const ymd = issueDate.slice(0, 10).replace(/-/g, "");
  return `${inv}-${svc}-${ymd}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function b64encode(s: string): string {
  // deno-lint-ignore no-explicit-any
  return (globalThis as any).btoa(unescape(encodeURIComponent(s)));
}

function buildParty(source: any, fallbackName: string | null | undefined) {
  return omitEmpty({
    party_name: source?.legal_name ?? source?.name ?? fallbackName,
    tin: source?.tin ?? null,
    email: source?.email ?? null,
    telephone: source?.phone ?? null,
    business_description: source?.industry ?? source?.industry_code ?? null,
    postal_address: {
      street_name: source?.address_line1 ?? null,
      city_name: source?.city ?? null,
      postal_zone: source?.postcode ?? null,
      country: (source?.country_code ?? "NG").toUpperCase(),
    },
  });
}

function buildPayload(invoice: any, lines: any[], company: any, customer: any, irn: string) {
  const builtLines = (lines ?? []).map((l: any, idx: number) => {
    const qty = Number(l.qty ?? 0);
    const unitPrice = Number(l.unit_price ?? 0);
    const taxRate = Number(l.tax_rate ?? 0);
    const discount = Number(l.discount_amount ?? 0);
    const cat = (l.tax_category ?? "S") as string;
    const net = round2(qty * unitPrice - discount);
    const taxAmount = cat === "S" ? round2(net * (taxRate / 100)) : 0;
    const unitCode = (l.unit_code ?? "EA").toUpperCase();
    const gross = round2(qty * unitPrice);
    return {
      position: l.position ?? idx,
      hsn_code: l.item_classification_code ?? null,
      product_category: l.product_category ?? l.description,
      discount_rate: gross > 0 ? round2((discount / gross) * 100) : 0,
      discount_amount: discount,
      fee_rate: 0,
      fee_amount: 0,
      invoiced_quantity: qty,
      line_extension_amount: net,
      item: {
        name: l.description,
        description: l.description,
        sellers_item_identification: l.line_uuid ?? l.id,
      },
      price: {
        price_amount: unitPrice,
        base_quantity: 1,
        price_unit: `${invoice.currency ?? "NGN"} per ${unitCode}`,
      },
      quantity: qty,
      net_amount: net,
      tax_category: cat,
      tax_rate: taxRate,
      taxable_amount: cat === "S" ? net : 0,
      tax_amount: taxAmount,
    };
  });

  const subtotal = round2(builtLines.reduce((s, l) => s + l.net_amount, 0));
  const taxTotal = round2(builtLines.reduce((s, l) => s + l.tax_amount, 0));
  const taxableAmount = round2(builtLines.reduce((s, l) => s + l.taxable_amount, 0));
  const discountTotal = Number(invoice.discount_total ?? 0);
  const grandTotal = round2(subtotal + taxTotal - discountTotal);
  const currency = (invoice.currency ?? "NGN").toUpperCase();
  const invoiceType = invoice.invoice_type ?? "commercial";
  const taxSubtotals = Object.values(
    builtLines.reduce((groups: Record<string, any>, line: any) => {
      const key = `${line.tax_category}:${line.tax_rate}`;
      if (!groups[key]) {
        groups[key] = {
          taxable_amount: 0,
          tax_amount: 0,
          tax_category: {
            id: TAX_CATEGORY_ID[line.tax_category] ?? line.tax_category,
            percent: line.tax_rate,
          },
        };
      }
      groups[key].taxable_amount = round2(groups[key].taxable_amount + line.taxable_amount);
      groups[key].tax_amount = round2(groups[key].tax_amount + line.tax_amount);
      return groups;
    }, {}),
  );

  return omitEmpty({
    business_id: company?.nrs_business_id ?? null,
    irn,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    invoice_type_code: INVOICE_TYPE_CODE[invoiceType] ?? "396",
    payment_status: invoice.payment_status ?? "PENDING",
    note: invoice.notes ?? null,
    tax_point_date: invoice.supply_date ?? invoice.issue_date,
    document_currency_code: currency,
    tax_currency_code: currency,
    accounting_cost: String(invoice.accounting_cost ?? subtotal),
    buyer_reference: invoice.customer_name ?? null,
    accounting_supplier_party: buildParty(company, company?.name),
    accounting_customer_party: buildParty(customer, invoice.customer_name),
    actual_delivery_date: invoice.supply_date ?? invoice.issue_date,
    payment_means: invoice.payment_means_code
      ? [{ payment_means_code: invoice.payment_means_code, payment_due_date: invoice.due_date }]
      : undefined,
    payment_terms_note: invoice.payment_terms ?? null,
    allowance_charge: discountTotal > 0
      ? [{ charge_indicator: false, amount: discountTotal }]
      : undefined,
    tax_total: [{
      tax_amount: taxTotal,
      tax_subtotal: taxSubtotals,
    }],
    legal_monetary_total: {
      line_extension_amount: subtotal,
      tax_exclusive_amount: taxableAmount || subtotal,
      tax_inclusive_amount: round2(subtotal + taxTotal),
      payable_amount: grandTotal,
    },
    invoice_line: builtLines.map((line: any) => omitEmpty({
      hsn_code: line.hsn_code,
      product_category: line.product_category,
      discount_rate: line.discount_rate,
      discount_amount: line.discount_amount,
      fee_rate: line.fee_rate,
      fee_amount: line.fee_amount,
      invoiced_quantity: line.invoiced_quantity,
      line_extension_amount: line.line_extension_amount,
      item: line.item,
      price: line.price,
    })),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const invoiceId: string | undefined = body.invoice_id;
    const forceFail: boolean = body.force_fail === true;
    if (!invoiceId) return json({ error: "invoice_id is required" }, 400);

    // Fetch invoice + related (service role bypasses RLS, so we re-check membership below)
    const { data: invoice, error: invErr } = await supabase
      .from("invoices").select("*").eq("id", invoiceId).maybeSingle();
    if (invErr) throw invErr;
    if (!invoice) return json({ error: "Invoice not found" }, 404);

    // Authorization: caller must be able to manage invoices for this company
    const { data: canManage, error: rpcErr } = await supabase.rpc("can_manage_invoices", {
      _user_id: userData.user.id,
      _company_id: invoice.company_id,
    });
    if (rpcErr) throw rpcErr;
    if (!canManage) return json({ error: "Forbidden" }, 403);

    const [{ data: lines }, { data: company }, customerRes] = await Promise.all([
      supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("position"),
      supabase.from("companies").select("*").eq("id", invoice.company_id).maybeSingle(),
      invoice.customer_id
        ? supabase.from("customers").select("*").eq("id", invoice.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const customer = (customerRes as any).data ?? null;

    const environment: string = (company as any)?.nrs_environment ?? "mock";
    const serviceId: string | null = (company as any)?.nrs_service_id ?? null;

    // IRN: reuse existing if already persisted, otherwise build & persist
    const irn = invoice.irn ?? buildIrn(invoice.number, serviceId, invoice.issue_date);
    const payload = buildPayload(invoice, lines ?? [], company, customer, irn);

    let response: any;
    let httpStatus = 200;
    let submissionStatus = "signed";
    let nextInvoiceStatus: string | null = "Signed";

    if (environment === "mock") {
      if (forceFail) {
        response = {
          status: false,
          message: "Mock submission rejected",
          errors: [{ field: "mock", code: "MOCK_FAIL", message: "Forced failure for testing" }],
        };
        submissionStatus = "rejected";
        nextInvoiceStatus = "Rejected";
        httpStatus = 422;
      } else {
        const signed = JSON.stringify(payload);
        response = {
          status: true,
          message: "Mock submission successful",
          data: {
            irn,
            qrCode: b64encode(signed),
            signedInvoice: signed,
          },
        };
      }
    } else {
      const baseUrl = getNrsBaseUrl(company, environment);
      const credentials = await loadNrsCredentials(supabase, invoice.company_id, company);

      // Step 0: Session Authentication
      await authenticateNrsTaxpayer(baseUrl, credentials);

      // Step 1: Validate
      const validateResult = await validateNrsInvoice(baseUrl, credentials, payload);
      response = validateResult.response;
      httpStatus = validateResult.httpStatus;

      if (validateResult.response.status === false) {
        submissionStatus = "rejected";
        nextInvoiceStatus = "Rejected";
      } else {
        // Step 2: Sign
        const signResult = await signNrsInvoice(baseUrl, credentials, payload);
        if (!signResult.ok) {
          response = signResult.response ?? { status: false, message: signResult.message };
          httpStatus = signResult.status;
          submissionStatus = "rejected";
          nextInvoiceStatus = "Rejected";
        } else {
          // Stashing the signed payload
          const signedPayload = signResult.data;

          // Step 3: Transmit to Ledger
          const transmitResult = await transmitNrsInvoice(baseUrl, credentials, irn, signedPayload);
          if (!transmitResult.ok) {
            // Validate & Sign succeeded, but transmission failed.
            // Mark invoice as Signed so we can recover later.
            response = transmitResult.response ?? { status: false, message: transmitResult.message };
            httpStatus = transmitResult.status;
            submissionStatus = "failed";
            nextInvoiceStatus = "Signed";
          } else {
            response = transmitResult.data ?? { status: true, message: "Invoice cleared and ledger transmitted" };
            httpStatus = 200;
            submissionStatus = "validated";
            nextInvoiceStatus = "Validated";
          }
        }
      }
    }

    // Log submission against actual nrs_submissions schema
    // Columns: payload (jsonb), validation_errors (jsonb), result (enum), scenario (text),
    //          mock (bool), created_by (uuid), company_id, invoice_id
    const isMock = environment === "mock";
    const result = response.status === false
      ? (nextInvoiceStatus === "Signed" ? "failed" : "rejected")
      : "validated";
    const scenario = isMock
      ? response.status === false ? "mock_failure" : "mock_success"
      : environment;
    const validationErrors = response.status === false
      ? response.errors ?? [{ message: response.message }]
      : null;

    const { error: logErr } = await supabase.from("nrs_submissions").insert({
      company_id: invoice.company_id,
      invoice_id: invoiceId,
      payload,
      validation_errors: validationErrors,
      result,
      scenario,
      mock: isMock,
      created_by: userData.user.id,
    });
    if (logErr) {
      console.error("nrs_submissions insert failed", logErr.message);
    }

    // Update invoice: persist IRN and walk status
    const updates: Record<string, any> = { irn };
    if (nextInvoiceStatus) updates.status = nextInvoiceStatus;
    await supabase.from("invoices").update(updates).eq("id", invoiceId);

    // For successful mock submissions, simulate the Submitted -> Signed -> Confirmed walk
    // by leaving the invoice at "Signed". The UI can advance to "Confirmed" via the
    // existing manual workflow button. (Do not auto-jump silently to Confirmed.)

    return json({
      ok: response.status !== false,
      environment,
      irn,
      response,
    }, httpStatus === 422 ? 200 : 200);
  } catch (e) {
    console.error("nrs-submit error", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
