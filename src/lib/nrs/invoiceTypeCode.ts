// Invoice type code normalization — mirrors deployed nrs-submit v82 behavior.
// Kept as a pure, dependency-free module so both the frontend tests and the
// checked-in Edge Function copy share the exact same mapping.

// Semantic alias -> NRS invoice type code.
export const INVOICE_TYPE_CODE: Record<string, string> = {
  commercial: "380",
  credit_note: "381",
  debit_note: "383",
  corrected: "384",
  proforma: "325",
};

const FALLBACK_INVOICE_TYPE_CODE = "380";

/**
 * Resolve the NRS invoice type code for a stored invoice_type value.
 * - missing/empty or "commercial" -> "380"
 * - a three-digit numeric code is preserved as-is
 * - semantic aliases resolve through INVOICE_TYPE_CODE
 * - anything else falls back to "380"
 */
export function normalizeInvoiceTypeCode(invoiceType: string | null | undefined): string {
  const raw = (invoiceType ?? "").trim();
  if (!raw) return FALLBACK_INVOICE_TYPE_CODE;
  if (/^\d{3}$/.test(raw)) return raw;
  return INVOICE_TYPE_CODE[raw] ?? FALLBACK_INVOICE_TYPE_CODE;
}
