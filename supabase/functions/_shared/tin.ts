const KNOWN_TIN_PLACEHOLDERS = new Set([
  "NGPENDING", "PENDING", "NOTAVAILABLE", "NA", "NONE", "UNKNOWN", "TEST",
]);

export function normalizeTaxpayerTin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const tin = value.trim();
  if (!tin) return null;
  const key = tin.toUpperCase().replace(/[\s-]/g, "");
  const digits = tin.replace(/\D/g, "");
  if (KNOWN_TIN_PLACEHOLDERS.has(key) || !digits || /^0+$/.test(digits) || /^(\d)\1{7,}$/.test(digits)) {
    return null;
  }
  return tin;
}

export function isUsableTaxpayerTin(value: unknown): boolean {
  return normalizeTaxpayerTin(value) !== null;
}
