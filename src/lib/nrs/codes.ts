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

// Tolerance for monetary equality checks.
export const MONEY_TOLERANCE = 0.02;

export function approxEqual(a: number, b: number, tol = MONEY_TOLERANCE) {
  return Math.abs(a - b) <= tol;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
