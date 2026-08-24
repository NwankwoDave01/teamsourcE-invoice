/**
 * NRS invoice payload mapping.
 *
 * This produces the REAL request body posted to
 *   POST /api/v1/invoice/validate
 *   POST /api/v1/invoice/sign
 * with the field names required by the NRS invoice schema. It is no longer an
 * internal-only preview structure.
 */
import { TAX_CATEGORY_ID, normalizeTaxCategory, type TaxCategoryShort } from "./taxCategory.ts";

export const INVOICE_TYPE_CODE: Record<string, string> = {
  commercial: "396",
  credit_note: "381",
  debit_note: "383",
  corrected: "384",
  proforma: "325",
};

export function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// deno-lint-ignore-file no-explicit-any
type AnyRow = Record<string, any>;

/** Drop null / undefined / "" recursively so NRS never receives empty fields. */
export function omitEmpty(value: any): any {
  if (Array.isArray(value)) {
    return value.map(omitEmpty).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => [key, omitEmpty(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined);
    return Object.fromEntries(entries as [string, any][]);
  }
  return value === null || value === undefined || value === "" ? undefined : value;
}

/** PRODUCT / SERVICE / MIXED derived from the line classification data we hold. */
export function deriveInvoiceKind(invoice: AnyRow, lines: AnyRow[]): string {
  const explicit = typeof invoice?.invoice_kind === "string" ? invoice.invoice_kind.trim().toUpperCase() : "";
  if (explicit) return explicit;
  if (!lines || lines.length === 0) return "";
  const flags = lines.map((l) => {
    const cat = String(l?.product_category ?? "").trim().toUpperCase();
    if (cat === "SERVICE") return "SERVICE";
    if (cat === "PRODUCT") return "PRODUCT";
    return l?.hsn_code || l?.item_classification_code ? "PRODUCT" : "SERVICE";
  });
  const unique = Array.from(new Set(flags));
  return unique.length === 1 ? unique[0] : "MIXED";
}

function buildAddress(source: AnyRow | null) {
  return omitEmpty({
    street_name: source?.address_line1 ?? null,
    additional_street_name: source?.address_line2 ?? null,
    city_name: source?.city ?? null,
    postal_zone: source?.postcode ?? null,
    country_subentity: source?.state ?? null,
    country_subentity_code: source?.lga ?? null,
    country: (source?.country_code ?? "NG").toUpperCase(),
  });
}

export function buildSupplierParty(company: AnyRow | null) {
  return omitEmpty({
    party_name: company?.legal_name ?? company?.name ?? null,
    tin: company?.tin ?? null,
    email: company?.email ?? null,
    telephone: company?.phone ?? null,
    business_description: company?.industry ?? company?.industry_code ?? null,
    postal_address: buildAddress(company),
  });
}

export function buildCustomerParty(customer: AnyRow | null, invoice: AnyRow) {
  return omitEmpty({
    party_name: customer?.name ?? invoice?.customer_name ?? null,
    tin: customer?.tin ?? null,
    email: customer?.email ?? null,
    telephone: customer?.phone ?? null,
    postal_address: buildAddress(customer),
  });
}

export interface MappedLine {
  short: TaxCategoryShort | null;
  taxRate: number;
  netAmount: number;
  taxableAmount: number;
  taxAmount: number;
  nrs: AnyRow;
}

export function mapLine(line: AnyRow, index: number, currency: string): MappedLine {
  const qty = Number(line?.qty ?? 0);
  const unitPrice = Number(line?.unit_price ?? 0);
  const taxRate = Number(line?.tax_rate ?? 0);
  const discount = Number(line?.discount_amount ?? 0);
  const short = normalizeTaxCategory(line?.tax_category);
  const net = round2(qty * unitPrice - discount);
  const taxable = short === "S" ? net : 0;
  const taxAmount = short === "S" ? round2(net * (taxRate / 100)) : 0;
  const unitCode = String(line?.unit_code ?? "EA").toUpperCase();
  const gross = round2(qty * unitPrice);

  return {
    short,
    taxRate,
    netAmount: net,
    taxableAmount: taxable,
    taxAmount,
    nrs: omitEmpty({
      hsn_code: line?.hsn_code ?? line?.item_classification_code ?? null,
      product_category: line?.product_category ?? null,
      discount_rate: gross > 0 ? round2((discount / gross) * 100) : 0,
      discount_amount: discount,
      fee_rate: 0,
      fee_amount: 0,
      invoiced_quantity: qty,
      invoiced_quantity_unit_code: unitCode,
      line_extension_amount: net,
      item: omitEmpty({
        name: line?.description ?? null,
        description: line?.description ?? null,
        sellers_item_identification: line?.sku ?? line?.id ?? String(index),
        classified_tax_category: short
          ? { id: TAX_CATEGORY_ID[short], percent: short === "S" ? taxRate : 0 }
          : undefined,
      }),
      price: omitEmpty({
        price_amount: unitPrice,
        base_quantity: Number(line?.base_quantity ?? 1),
        price_unit: `${currency} per ${unitCode}`,
      }),
    }),
  };
}

export interface MapPayloadInput {
  invoice: AnyRow;
  lines: AnyRow[];
  company: AnyRow | null;
  customer: AnyRow | null;
  irn: string;
}

export function mapNrsInvoicePayload({ invoice, lines, company, customer, irn }: MapPayloadInput): AnyRow {
  const currency = String(invoice?.currency ?? "NGN").toUpperCase();
  const mapped = (lines ?? []).map((l, i) => mapLine(l, i, currency));

  const subtotal = round2(mapped.reduce((s, l) => s + l.netAmount, 0));
  const taxTotal = round2(mapped.reduce((s, l) => s + l.taxAmount, 0));
  const discountTotal = Number(invoice?.discount_total ?? 0);
  const payable = round2(subtotal + taxTotal - discountTotal);

  const groups = new Map<string, { taxable_amount: number; tax_amount: number; tax_category: { id: string; percent: number } }>();
  for (const line of mapped) {
    if (!line.short) continue; // invalid categories are rejected by validation before this point
    const percent = line.short === "S" ? line.taxRate : 0;
    const key = `${line.short}:${percent}`;
    const existing = groups.get(key) ?? {
      taxable_amount: 0,
      tax_amount: 0,
      tax_category: { id: TAX_CATEGORY_ID[line.short], percent },
    };
    existing.taxable_amount = round2(existing.taxable_amount + line.taxableAmount);
    existing.tax_amount = round2(existing.tax_amount + line.taxAmount);
    groups.set(key, existing);
  }

  const invoiceType = String(invoice?.invoice_type ?? "commercial");
  const issueTime = typeof invoice?.issue_time === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(invoice.issue_time)
    ? (invoice.issue_time.length === 5 ? `${invoice.issue_time}:00` : invoice.issue_time)
    : null;

  return omitEmpty({
    business_id: company?.nrs_business_id ?? null,
    irn,
    issue_date: invoice?.issue_date ?? null,
    due_date: invoice?.due_date ?? null,
    issue_time: issueTime,
    invoice_type_code: INVOICE_TYPE_CODE[invoiceType] ?? "396",
    invoice_kind: deriveInvoiceKind(invoice, lines ?? []),
    payment_status: invoice?.payment_status ?? "PENDING",
    note: invoice?.notes ?? null,
    tax_point_date: invoice?.supply_date ?? invoice?.issue_date ?? null,
    document_currency_code: currency,
    tax_currency_code: String(invoice?.tax_currency_code ?? currency).toUpperCase(),
    accounting_cost: invoice?.accounting_cost != null ? String(invoice.accounting_cost) : String(subtotal),
    buyer_reference: invoice?.po_reference ?? invoice?.customer_name ?? null,
    invoice_delivery_period: invoice?.delivery_period_start && invoice?.delivery_period_end
      ? { start_date: invoice.delivery_period_start, end_date: invoice.delivery_period_end }
      : undefined,
    order_reference: invoice?.po_reference ?? null,
    billing_reference: invoice?.original_invoice_number
      ? [{ irn: invoice.original_invoice_number, issue_date: invoice?.original_invoice_date ?? null }]
      : undefined,
    actual_delivery_date: invoice?.supply_date ?? null,
    accounting_supplier_party: buildSupplierParty(company),
    accounting_customer_party: buildCustomerParty(customer, invoice),
    payment_means: invoice?.payment_means_code
      ? [{ payment_means_code: String(invoice.payment_means_code), payment_due_date: invoice?.due_date ?? null }]
      : undefined,
    payment_terms_note: invoice?.payment_terms ?? null,
    allowance_charge: discountTotal > 0
      ? [{ charge_indicator: false, amount: discountTotal }]
      : undefined,
    tax_total: [{
      tax_amount: taxTotal,
      tax_subtotal: Array.from(groups.values()),
    }],
    legal_monetary_total: {
      line_extension_amount: subtotal,
      tax_exclusive_amount: subtotal,
      tax_inclusive_amount: round2(subtotal + taxTotal),
      payable_amount: payable,
      allowance_total_amount: discountTotal > 0 ? discountTotal : undefined,
    },
    invoice_line: mapped.map((l) => l.nrs),
  });
}
