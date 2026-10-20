// Invoice type code normalization — mirrors deployed nrs-submit v83 behavior.
// Canonical implementation lives in supabase/functions/_shared so the Edge
// Function and frontend share the exact same mapping without cross-tree imports.

// Semantic alias -> NRS invoice type code.
export const INVOICE_TYPE_CODE: Record<string, string> = {
  commercial: "396",
  credit_note: "381",
  debit_note: "383",
  corrected: "384",
  proforma: "325",
};

const PRESERVED_NUMERIC_CODES = new Set(["381", "383", "384", "325"]);
const FALLBACK_INVOICE_TYPE_CODE = "396";

/**
 * Resolve the NRS invoice type code for a stored invoice_type value:
 * - "380", "commercial", empty, whitespace, null, or undefined -> "396"
 * - "381", "383", "384", "325" -> preserved as-is
 * - semantic aliases ("credit_note", "debit_note", "corrected", "proforma") -> resolved
 * - unknown values (including arbitrary numeric codes like "999") -> "396"
 */
export function normalizeInvoiceTypeCode(invoiceType: string | null | undefined): string {
  const raw = (invoiceType ?? "").trim();
  if (!raw || raw === "380" || raw === "commercial") return FALLBACK_INVOICE_TYPE_CODE;
  if (PRESERVED_NUMERIC_CODES.has(raw)) return raw;
  return INVOICE_TYPE_CODE[raw] ?? FALLBACK_INVOICE_TYPE_CODE;
}
