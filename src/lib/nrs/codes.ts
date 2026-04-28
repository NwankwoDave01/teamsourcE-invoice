// Reference code lists used by the NRS mapping/validation layer.
// These are placeholders aligned with UN/ECE Rec 20 + ISO 4217 and will be
// reconciled with the official NRS code lists before live integration.

export const ALLOWED_UNIT_CODES = new Set([
  "EA",  // Each
  "PCE", // Piece
  "KGM", // Kilogram
  "GRM", // Gram
  "LTR", // Litre
  "MTR", // Metre
  "MTQ", // Cubic metre
  "MTK", // Square metre
  "BX",  // Box
  "CT",  // Carton
  "PK",  // Pack
  "BG",  // Bag
  "BO",  // Bottle
  "H87", // Piece (UN/ECE numeric)
  "HUR", // Hour
  "DAY", // Day
  "MON", // Month
  "ANN", // Year
  "SET", // Set
  "ROL", // Roll
  "TNE", // Tonne
]);

export const ALLOWED_CURRENCIES = new Set([
  "NGN", "USD", "EUR", "GBP", "CAD", "ZAR", "GHS", "XOF", "XAF",
  "CNY", "JPY", "INR", "AED", "SAR",
]);

export const ALLOWED_TAX_CATEGORIES = new Set(["S", "Z", "E", "O"]);

export const ALLOWED_COUNTRY_CODES_RE = /^[A-Z]{2}$/;

// ----- Option lists shared by NRS-related forms -----

export const UNIT_CODE_OPTIONS: { value: string; label: string }[] = [
  { value: "EA", label: "EA — Each" },
  { value: "PCE", label: "PCE — Piece" },
  { value: "KGM", label: "KGM — Kilogram" },
  { value: "GRM", label: "GRM — Gram" },
  { value: "LTR", label: "LTR — Litre" },
  { value: "MTR", label: "MTR — Metre" },
  { value: "MTQ", label: "MTQ — Cubic metre" },
  { value: "MTK", label: "MTK — Square metre" },
  { value: "BX", label: "BX — Box" },
  { value: "CT", label: "CT — Carton" },
  { value: "PK", label: "PK — Pack" },
  { value: "BG", label: "BG — Bag" },
  { value: "BO", label: "BO — Bottle" },
  { value: "HUR", label: "HUR — Hour" },
  { value: "DAY", label: "DAY — Day" },
  { value: "MON", label: "MON — Month" },
  { value: "ANN", label: "ANN — Year" },
  { value: "SET", label: "SET — Set" },
  { value: "ROL", label: "ROL — Roll" },
  { value: "TNE", label: "TNE — Tonne" },
];

export const TAX_CATEGORY_OPTIONS: { value: "S" | "Z" | "E" | "O"; label: string }[] = [
  { value: "S", label: "S — Standard rated" },
  { value: "Z", label: "Z — Zero rated" },
  { value: "E", label: "E — Exempt" },
  { value: "O", label: "O — Out of scope" },
];

export const BUYER_TYPE_OPTIONS: { value: "business" | "individual" | "government" | "foreign"; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "individual", label: "Individual" },
  { value: "government", label: "Government" },
  { value: "foreign", label: "Foreign" },
];

export const INVOICE_TYPE_OPTIONS: { value: "commercial" | "credit_note" | "debit_note" | "corrected" | "proforma"; label: string }[] = [
  { value: "commercial", label: "Commercial invoice" },
  { value: "credit_note", label: "Credit note" },
  { value: "debit_note", label: "Debit note" },
  { value: "corrected", label: "Corrected invoice" },
  { value: "proforma", label: "Proforma" },
];

export const TRANSACTION_TYPE_OPTIONS: { value: "B2B" | "B2C" | "B2G" | "export"; label: string }[] = [
  { value: "B2B", label: "B2B — Business to business" },
  { value: "B2C", label: "B2C — Business to consumer" },
  { value: "B2G", label: "B2G — Business to government" },
  { value: "export", label: "Export" },
];

export const PAYMENT_MEANS_OPTIONS: { value: string; label: string }[] = [
  { value: "30", label: "30 — Bank transfer" },
  { value: "10", label: "10 — Cash" },
  { value: "48", label: "48 — Card payment" },
  { value: "42", label: "42 — Cheque" },
  { value: "97", label: "97 — Other" },
];

// Tolerance for monetary equality checks.
export const MONEY_TOLERANCE = 0.02;

export function approxEqual(a: number, b: number, tol = MONEY_TOLERANCE) {
  return Math.abs(a - b) <= tol;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
