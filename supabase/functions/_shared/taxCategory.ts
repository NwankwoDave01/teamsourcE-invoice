// Strict NRS tax-category normalization.
//
// The TeamSource product/invoice layer stores S / Z / E / O. NRS expects the
// long-form category IDs. Any other value (e.g. classification metadata such as
// "LOCAL_SALES_TAX" leaking in from a product import) is INVALID and must never
// silently overwrite the tax category.

export type TaxCategoryShort = "S" | "Z" | "E" | "O";

export const TAX_CATEGORY_ID: Record<TaxCategoryShort, string> = {
  S: "STANDARD_VAT",
  Z: "ZERO_RATED",
  E: "VAT_EXEMPT",
  O: "OUT_OF_SCOPE",
};

const LONG_TO_SHORT: Record<string, TaxCategoryShort> = {
  STANDARD_VAT: "S",
  ZERO_RATED: "Z",
  VAT_EXEMPT: "E",
  OUT_OF_SCOPE: "O",
};

/** Returns the canonical short code, or null when the value is not a valid NRS category. */
export function normalizeTaxCategory(value: unknown): TaxCategoryShort | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  if (v === "S" || v === "Z" || v === "E" || v === "O") return v;
  return LONG_TO_SHORT[v] ?? null;
}

/** NRS tax category ID for a raw stored value; null when invalid. */
export function taxCategoryId(value: unknown): string | null {
  const short = normalizeTaxCategory(value);
  return short ? TAX_CATEGORY_ID[short] : null;
}

/** Only standard-rated lines accrue VAT. */
export function isTaxable(short: TaxCategoryShort): boolean {
  return short === "S";
}
