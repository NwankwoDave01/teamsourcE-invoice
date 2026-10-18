// Fail-closed adapter for nrs-submit responses. The live function contract
// (ok, stage, outcome, retry_safe, error, details) is newer than the checked-in
// source, so every field is treated as optional and success requires ok === true.

export type SubmitOutcomeKind = "success" | "rejected" | "unconfirmed";

export interface SubmitResult {
  kind: SubmitOutcomeKind;
  stage: string | null;
  /** True only when the server explicitly says a retry is safe. */
  retrySafe: boolean;
  message: string;
  details: string | null;
}

const UNKNOWN_OUTCOMES = new Set(["unknown", "timeout", "ambiguous", "pending"]);

function text(value: unknown, max = 500): string | null {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, max);
  if (value && typeof value === "object") {
    const msg = (value as Record<string, unknown>).message;
    if (typeof msg === "string" && msg.trim()) return msg.trim().slice(0, max);
  }
  return null;
}

function detailsText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return text(value, 1000);
  if (Array.isArray(value)) {
    const parts = value.map((v) => text(v, 200)).filter(Boolean);
    return parts.length ? parts.join("; ").slice(0, 1000) : null;
  }
  return text(value, 1000);
}

function stageLabel(stage: string | null) {
  if (stage === "validate" || stage === "validation") return "NRS validation";
  if (stage === "sign" || stage === "signing") return "NRS signing";
  return "NRS processing";
}

export function parseSubmitResult(data: unknown, invokeError: unknown): SubmitResult {
  const unconfirmed = (message: string, stage: string | null = null, details: string | null = null): SubmitResult =>
    ({ kind: "unconfirmed", stage, retrySafe: false, message, details });

  if (invokeError) {
    return unconfirmed("The result could not be confirmed. Do not resubmit — refresh the invoice to check its status.");
  }
  let body: unknown = data;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return unconfirmed("No readable response was received. Do not resubmit — refresh the invoice to check its status.");
  }
  const d = body as Record<string, unknown>;
  const stage = typeof d.stage === "string" ? d.stage.toLowerCase() : null;
  const outcome = typeof d.outcome === "string" ? d.outcome.toLowerCase() : null;
  const details = detailsText(d.details);
  const serverMsg = text(d.error) ?? text(d.message) ?? text(d.response);

  if (d.ok === true && !(outcome && UNKNOWN_OUTCOMES.has(outcome))) {
    return { kind: "success", stage, retrySafe: false, message: "Invoice validated and signed in the NRS sandbox.", details: null };
  }
  if (d.ok !== false || (outcome && UNKNOWN_OUTCOMES.has(outcome))) {
    return unconfirmed(
      `${stageLabel(stage)} outcome is unconfirmed. Do not resubmit — refresh the invoice to check its status.`,
      stage, details,
    );
  }
  const retrySafe = d.retry_safe === true;
  return {
    kind: "rejected",
    stage,
    retrySafe,
    message: `${stageLabel(stage)} rejected${serverMsg ? `: ${serverMsg}` : "."}${retrySafe ? " Fix the issue and try again." : " Do not resubmit until the status has been reviewed."}`,
    details,
  };
}
