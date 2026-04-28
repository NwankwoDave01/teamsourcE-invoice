import { supabase } from "@/integrations/supabase/client";
import type {
  NrsBuildResult,
  NrsInvoicePayload,
  NrsLine,
} from "./types";
import { INVOICE_TYPE_CODE } from "./types";
import { validateForNrs } from "./validators";
import { round2 } from "./codes";

/**
 * Build an internal UBL-style NRS payload preview for an invoice.
 *
 * NOTE: The returned payload is an INTERNAL preview/mapping structure, not the
 * final live NRS API payload. We will reconcile fields with the official NRS
 * schema before real API integration.
 *
 * Validation errors block payload generation; warnings are returned alongside
 * the payload so the user can still preview.
 */
export async function buildNrsPayload(invoiceId: string): Promise<NrsBuildResult> {
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invErr) throw invErr;
  if (!invoice) {
    return {
      payload: null,
      issues: [{ field: "invoice", code: "NOT_FOUND", message: "Invoice not found.", severity: "error" }],
      hasErrors: true,
      hasWarnings: false,
    };
  }

  const [{ data: lines }, { data: company }, customerRes] = await Promise.all([
    supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("position"),
    supabase.from("companies").select("*").eq("id", invoice.company_id).maybeSingle(),
    invoice.customer_id
      ? supabase.from("customers").select("*").eq("id", invoice.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const customer = (customerRes as any).data ?? null;

  const issues = validateForNrs({
    invoice,
    lines: lines ?? [],
    company,
    customer,
  });

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasWarnings = issues.some((i) => i.severity === "warning");

  if (hasErrors) {
    return { payload: null, issues, hasErrors, hasWarnings };
  }

  const currency = (invoice.currency ?? "NGN").toUpperCase();
  const invoiceType = (invoice.invoice_type ?? "commercial") as keyof typeof INVOICE_TYPE_CODE;

  const builtLines: NrsLine[] = (lines ?? []).map((l: any, idx: number) => {
    const qty = Number(l.qty ?? 0);
    const unitPrice = Number(l.unit_price ?? 0);
    const taxRate = Number(l.tax_rate ?? 0);
    const discount = Number(l.discount_amount ?? 0);
    const cat = (l.tax_category ?? "S") as NrsLine["taxCategory"];
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
      unitPrice: unitPrice,
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

  const payload: NrsInvoicePayload = {
    documentUuid: invoice.document_uuid ?? invoice.id,
    invoiceNumber: invoice.number,
    invoiceTypeCode: INVOICE_TYPE_CODE[invoiceType] ?? "380",
    transactionType: (invoice.transaction_type ?? "B2B") as NrsInvoicePayload["transactionType"],
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    supplyDate: invoice.supply_date ?? invoice.issue_date,
    currencyCode: currency,
    exchangeRate: Number(invoice.exchange_rate ?? 1),
    supplier: {
      tin: company?.tin ?? null,
      vatNumber: company?.vat_number ?? null,
      rcNumber: company?.rc_number ?? null,
      legalName: company?.legal_name ?? company?.name ?? null,
      tradeName: company?.name ?? "",
      email: company?.email ?? null,
      phone: company?.phone ?? null,
      address: {
        line1: company?.address_line1 ?? null,
        line2: company?.address_line2 ?? null,
        city: company?.city ?? null,
        state: company?.state ?? null,
        lga: company?.lga ?? null,
        postcode: company?.postcode ?? null,
        countryCode: (company?.country_code ?? "NG").toUpperCase(),
      },
    },
    buyer: {
      buyerType: (customer?.buyer_type ?? "business") as any,
      tin: customer?.tin ?? null,
      vatNumber: null,
      rcNumber: customer?.rc_number ?? null,
      legalName: customer?.name ?? invoice.customer_name,
      tradeName: customer?.name ?? invoice.customer_name,
      email: customer?.email ?? null,
      phone: customer?.phone ?? null,
      address: {
        line1: customer?.address_line1 ?? null,
        line2: customer?.address_line2 ?? null,
        city: customer?.city ?? null,
        state: customer?.state ?? null,
        lga: customer?.lga ?? null,
        postcode: customer?.postcode ?? null,
        countryCode: (customer?.country_code ?? "NG").toUpperCase(),
      },
    },
    paymentMeansCode: invoice.payment_means_code ?? "30",
    paymentTerms: invoice.payment_terms ?? null,
    poReference: invoice.po_reference ?? null,
    notes: invoice.notes ?? null,
    lines: builtLines,
    totals: {
      subtotal,
      discountTotal,
      taxableAmount,
      taxTotal,
      grandTotal,
      currency,
    },
  };

  return { payload, issues, hasErrors, hasWarnings };
}
