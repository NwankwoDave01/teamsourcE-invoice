// NRS submission edge function — supports mock / sandbox / production environments.
// In this iteration ONLY `mock` is implemented end-to-end. Sandbox & production
// branches are stubbed and return 501 until real credentials & signing are wired.
//
// Secrets (NEVER committed, NEVER logged):
//   NRS_API_KEY, NRS_API_SECRET, NRS_PRIVATE_KEY_PEM, NRS_PRIVATE_KEY_PASSPHRASE
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

function buildPayload(invoice: any, lines: any[], company: any, customer: any, irn: string) {
  const builtLines = (lines ?? []).map((l: any, idx: number) => {
    const qty = Number(l.qty ?? 0);
    const unitPrice = Number(l.unit_price ?? 0);
    const taxRate = Number(l.tax_rate ?? 0);
    const discount = Number(l.discount_amount ?? 0);
    const cat = (l.tax_category ?? "S") as string;
    const net = round2(qty * unitPrice - discount);
    const taxAmount = cat === "S" ? round2(net * (taxRate / 100)) : 0;
    return {
      lineUuid: l.line_uuid ?? l.id,
      position: l.position ?? idx,
      itemCode: l.item_classification_code ?? null,
      itemName: l.description,
      description: l.description,
      unitCode: (l.unit_code ?? "EA").toUpperCase(),
      quantity: qty,
      unitPrice,
      discountAmount: discount,
      netAmount: net,
      taxCategory: cat,
      taxScheme: l.tax_scheme ?? "VAT",
      taxRate,
      taxableAmount: cat === "S" ? net : 0,
      taxAmount,
      lineTotal: round2(net + taxAmount),
    };
  });

  const subtotal = round2(builtLines.reduce((s, l) => s + l.netAmount, 0));
  const taxTotal = round2(builtLines.reduce((s, l) => s + l.taxAmount, 0));
  const taxableAmount = round2(builtLines.reduce((s, l) => s + l.taxableAmount, 0));
  const discountTotal = Number(invoice.discount_total ?? 0);
  const grandTotal = round2(subtotal + taxTotal - discountTotal);
  const currency = (invoice.currency ?? "NGN").toUpperCase();

  return {
    documentUuid: invoice.document_uuid ?? invoice.id,
    irn,
    businessId: company?.nrs_business_id ?? null,
    invoiceNumber: invoice.number,
    invoiceTypeCode: "380",
    transactionType: invoice.transaction_type ?? "B2B",
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    supplyDate: invoice.supply_date ?? invoice.issue_date,
    currencyCode: currency,
    exchangeRate: Number(invoice.exchange_rate ?? 1),
    supplier: {
      tin: company?.tin ?? null,
      legalName: company?.legal_name ?? company?.name ?? null,
      tradeName: company?.name ?? "",
      email: company?.email ?? null,
      phone: company?.phone ?? null,
      address: {
        line1: company?.address_line1 ?? null,
        city: company?.city ?? null,
        state: company?.state ?? null,
        postcode: company?.postcode ?? null,
        countryCode: (company?.country_code ?? "NG").toUpperCase(),
      },
    },
    buyer: {
      buyerType: customer?.buyer_type ?? "business",
      tin: customer?.tin ?? null,
      legalName: customer?.name ?? invoice.customer_name,
      email: customer?.email ?? null,
      phone: customer?.phone ?? null,
      address: {
        line1: customer?.address_line1 ?? null,
        city: customer?.city ?? null,
        state: customer?.state ?? null,
        postcode: customer?.postcode ?? null,
        countryCode: (customer?.country_code ?? "NG").toUpperCase(),
      },
    },
    lines: builtLines,
    totals: { subtotal, discountTotal, taxableAmount, taxTotal, grandTotal, currency },
  };
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
      // sandbox / production not implemented yet — do NOT call real NRS
      return json({ error: `Environment '${environment}' not yet implemented` }, 501);
    }

    // Log submission
    const { error: logErr } = await supabase.from("nrs_submissions").insert({
      company_id: invoice.company_id,
      invoice_id: invoiceId,
      environment,
      endpoint: "/mock/invoice/submit",
      irn,
      request_payload: payload,
      response_payload: response,
      http_status: httpStatus,
      status: submissionStatus,
      error_code: response.status === false ? response.errors?.[0]?.code ?? null : null,
      error_message: response.status === false ? response.message ?? null : null,
      created_by: userData.user.id,
      submitted_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
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