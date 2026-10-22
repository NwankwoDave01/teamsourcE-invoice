export const NRS_INVOICE_TYPE_CODES = [
  "380",
  "381",
  "384",
  "385",
  "386",
  "388",
  "389",
  "390",
  "392",
  "393",
  "394",
  "395",
  "396",
  "397",
  "399",
  "400",
  "402",
  "404",
  "406",
  "408",
] as const;

const supportedCodes: ReadonlySet<string> = new Set(NRS_INVOICE_TYPE_CODES);

export const INVOICE_TYPE_CODE: Record<string, string> = {
  commercial: "381",
  commercial_invoice: "381",
  credit_note: "380",
  debit_note: "384",
  self_billed_invoice: "385",
  factored_invoice: "386",
  statement_of_account: "388",
  purchase_order: "389",
  proforma: "390",
  proforma_invoice: "390",
  consignment_invoice: "392",
  self_billed_credit_note: "393",
  self_billed_invoice_debit_note: "394",
  credit_note_request: "395",
  invoice_request: "396",
  final_settlement: "397",
  bill_of_lading: "399",
  waybill: "400",
  shipping_instructions: "402",
  certificate_of_origin: "404",
  customs_declaration: "406",
  packing_list: "408",
};

export type InvoiceTypeCodeResult =
  | { valid: true; code: string }
  | { valid: false; reason: "missing" | "unsupported" };

/** Resolve a stored invoice type to a code supported by the NRS resource. */
export function normalizeInvoiceTypeCode(
  invoiceType: string | null | undefined,
): InvoiceTypeCodeResult {
  const raw = invoiceType?.trim();
  if (!raw) return { valid: false, reason: "missing" };

  if (/^\d+$/.test(raw)) {
    return supportedCodes.has(raw)
      ? { valid: true, code: raw }
      : { valid: false, reason: "unsupported" };
  }

  const alias = raw.toLowerCase();
  const code = Object.prototype.hasOwnProperty.call(INVOICE_TYPE_CODE, alias)
    ? INVOICE_TYPE_CODE[alias]
    : undefined;
  return code
    ? { valid: true, code }
    : { valid: false, reason: "unsupported" };
}
