export interface SubmissionRecord {
  id: string;
  company_id: string;
  status: string;
  irn: string | null;
  submission_status?: string | null;
}

/** No existing attempt field proves retry safety. Any history requires review. */
export function submissionBlockReason(invoice: SubmissionRecord, companyId: string | null, history: ReadonlySet<string> | undefined, deviceBlocked = false): string | null {
  if (!companyId || invoice.company_id !== companyId) return "Active company does not match this invoice.";
  if (history === undefined) return "Submission history is unavailable or refreshing. Signing is blocked.";
  if (deviceBlocked || history.has(invoice.id)) return "A previous attempt is recorded. Do not resubmit; refresh status or contact support.";
  if (invoice.irn || (invoice.submission_status != null && invoice.submission_status !== "not_submitted")) return "A submission state is already recorded. Do not resubmit; review its status.";
  if (invoice.status !== "Ready") return "Only approved, ready invoices can be signed in the NRS sandbox.";
  return null;
}

// Non-secret safety marker only; never stores responses, invoice content or credentials.
function markerKey(userId: string, companyId: string, invoiceId: string) {
  return `teamsource-nrs-attempt:${userId}:${companyId}:${invoiceId}`;
}

export function hasDeviceAttempt(userId: string | undefined, companyId: string | null, invoiceId: string): boolean {
  if (!userId || !companyId) return true;
  try { return localStorage.getItem(markerKey(userId, companyId, invoiceId)) !== null; }
  catch { return true; }
}

export function markDeviceAttempt(userId: string, companyId: string, invoiceId: string): void {
  // Write BEFORE sending: a reload/network failure must not re-enable signing.
  localStorage.setItem(markerKey(userId, companyId, invoiceId), "blocked");
}