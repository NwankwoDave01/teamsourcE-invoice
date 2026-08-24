/**
 * IRN (Invoice Reference Number) — strict generation.
 *
 * Format (Generate IRN document):  {invoiceNumber}-{serviceId}-{YYYYMMDD}
 * Example:                         INV001-94ND90NR-20240611
 *
 * Rules enforced here (no silent sanitizing, no mock fallbacks):
 *  - invoice number must be non-empty and alphanumeric only
 *  - service ID must be exactly 8 alphanumeric characters (company-configured)
 *  - issue date must parse and contribute YYYYMMDD
 *  - resulting IRN must not exceed 80 characters
 */

export const MAX_IRN_LENGTH = 80;

export class IrnError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "IrnError";
    this.code = code;
  }
}

function ymd(issueDate: unknown): string {
  if (typeof issueDate !== "string" || !issueDate.trim()) {
    throw new IrnError("ISSUE_DATE_REQUIRED", "Invoice issue date is required to generate the IRN.");
  }
  const raw = issueDate.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const [, y, m, d] = iso;
    const probe = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (Number.isNaN(probe.getTime())) {
      throw new IrnError("ISSUE_DATE_INVALID", `Invoice issue date "${raw}" is not a valid date.`);
    }
    return `${y}${m}${d}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new IrnError("ISSUE_DATE_INVALID", `Invoice issue date "${raw}" is not a valid date.`);
  }
  const y = parsed.getUTCFullYear().toString().padStart(4, "0");
  const m = (parsed.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = parsed.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

export function assertValidInvoiceNumber(invoiceNumber: unknown): string {
  const value = typeof invoiceNumber === "string" ? invoiceNumber.trim() : "";
  if (!value) {
    throw new IrnError("INVOICE_NUMBER_REQUIRED", "Invoice number is required to generate the IRN.");
  }
  if (!/^[A-Za-z0-9]+$/.test(value)) {
    throw new IrnError(
      "INVOICE_NUMBER_INVALID",
      `Invoice number "${value}" must contain letters and digits only (no spaces, slashes or dashes) for NRS IRN generation.`,
    );
  }
  return value;
}

export function assertValidServiceId(serviceId: unknown): string {
  const value = typeof serviceId === "string" ? serviceId.trim() : "";
  if (!value) {
    throw new IrnError(
      "SERVICE_ID_REQUIRED",
      "NRS Service ID is not configured for this company. Add it in Settings → NRS Integration.",
    );
  }
  if (!/^[A-Za-z0-9]{8}$/.test(value)) {
    throw new IrnError(
      "SERVICE_ID_INVALID",
      "NRS Service ID must be exactly 8 alphanumeric characters.",
    );
  }
  return value;
}

/** Strict IRN builder. Throws IrnError with an actionable message on any violation. */
export function buildIrn(
  invoiceNumber: unknown,
  serviceId: unknown,
  issueDate: unknown,
): string {
  const inv = assertValidInvoiceNumber(invoiceNumber);
  const svc = assertValidServiceId(serviceId);
  const date = ymd(issueDate);
  const irn = `${inv}-${svc}-${date}`;
  if (irn.length > MAX_IRN_LENGTH) {
    throw new IrnError("IRN_TOO_LONG", `Generated IRN exceeds ${MAX_IRN_LENGTH} characters.`);
  }
  return irn;
}

/** Non-throwing variant for UI previews. */
export function tryBuildIrn(
  invoiceNumber: unknown,
  serviceId: unknown,
  issueDate: unknown,
): { irn: string | null; error: { code: string; message: string } | null } {
  try {
    return { irn: buildIrn(invoiceNumber, serviceId, issueDate), error: null };
  } catch (e) {
    const err = e as IrnError;
    return { irn: null, error: { code: err.code ?? "IRN_ERROR", message: err.message } };
  }
}
