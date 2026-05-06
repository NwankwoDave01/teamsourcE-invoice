/**
 * IRN (Invoice Reference Number) generator for NRS / FIRS e-invoicing.
 *
 * Format per NRS schema v1.1:
 *   <InvoiceNumber>-<ServiceID>-<YYYYMMDD>
 *
 * Example: INV001-94ND90NR-20240611
 *
 * Rules:
 *  - InvoiceNumber: supplier's internal invoice number (alphanumeric, hyphens stripped).
 *  - ServiceID: companies.nrs_service_id (falls back to "MOCKSVC" for mock mode).
 *  - YYYYMMDD: invoices.issue_date with no separators.
 *
 * Must be stable: generated once and persisted on invoices.irn.
 */
export function buildIrn(
  invoiceNumber: string,
  serviceId: string | null | undefined,
  issueDate: string,
): string {
  const inv = (invoiceNumber ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "INV";
  const svc = (serviceId ?? "MOCKSVC").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "MOCKSVC";
  const ymd = issueDate.slice(0, 10).replace(/-/g, "");
  return `${inv}-${svc}-${ymd}`;
}