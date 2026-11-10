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

export function taxpayerProfileIsComplete(company: {
  tin?: unknown;
  legal_name?: unknown;
  email?: unknown;
  address_line1?: unknown;
  city?: unknown;
  country_code?: unknown;
} | null | undefined): boolean {
  return Boolean(
    company && isUsableTaxpayerTin(company.tin) &&
    typeof company.legal_name === "string" && company.legal_name.trim() &&
    typeof company.email === "string" && company.email.trim() &&
    typeof company.address_line1 === "string" && company.address_line1.trim() &&
    typeof company.city === "string" && company.city.trim() &&
    typeof company.country_code === "string" && /^[A-Za-z]{2}$/.test(company.country_code.trim()),
  );
}
