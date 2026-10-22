// Fail-closed adapter for nrs-submit responses. The live function contract
// (ok, stage, outcome, retry_safe, error, details) is newer than the checked-in
// source, so every field is treated as optional and success requires ok === true.

export type SubmitOutcomeKind = "success" | "rejected" | "failed" | "unconfirmed";

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
    const parts = value.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return text(entry, 200);
      const item = entry as Record<string, unknown>;
      const message = text(item.message, 200);
      if (!message) return text(entry, 200);
      const field = text(item.field, 100);
      const code = text(item.code, 100);
      return `${field ? `${field}: ` : ""}${code ? `[${code}] ` : ""}${message}`;
    }).filter(Boolean);
    return parts.length ? parts.join("; ").slice(0, 1000) : null;
  }
  return text(value, 1000);
}

export function submissionStageLabel(stage: string | null) {
  if (stage === "validate" || stage === "validation" || stage === "nrs_validate") return "NRS validation";
  if (stage === "sign" || stage === "signing" || stage === "nrs_sign") return "NRS signing";
  if (stage === "transmit" || stage === "transmission") return "NRS transmission";
  if (stage === "authenticate" || stage === "authentication") return "NRS authentication";
  if (stage === "local_validation") return "Local checks";
  if (stage === "claim_attempt") return "Submission attempt claim";
  return "NRS processing";
}

function parseBody(value: unknown): Record<string, unknown> | null {
  let body = value;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
}

async function invokeErrorBody(invokeError: unknown): Promise<Record<string, unknown> | null> {
  if (!invokeError || typeof invokeError !== "object") return null;
  const context = (invokeError as Record<string, unknown>).context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      return parseBody(await context.clone().json());
    } catch {
      return null;
    }
  }
  return parseBody(context);
}

export async function parseSubmitResult(data: unknown, invokeError: unknown): Promise<SubmitResult> {
  const unconfirmed = (message: string, stage: string | null = null, details: string | null = null): SubmitResult =>
    ({ kind: "unconfirmed", stage, retrySafe: false, message, details });

  const body = parseBody(data) ?? await invokeErrorBody(invokeError);
  if (!body) {
    if (invokeError) {
      return unconfirmed("The result could not be confirmed. Do not resubmit — refresh the invoice to check its status.");
    }
    return unconfirmed("No readable response was received. Do not resubmit — refresh the invoice to check its status.");
  }
  const response = body.response && typeof body.response === "object" && !Array.isArray(body.response)
    ? body.response as Record<string, unknown>
    : null;
  const nestedResponse = response?.response && typeof response.response === "object" && !Array.isArray(response.response)
    ? response.response as Record<string, unknown>
    : null;
  const detailObject = body.details && typeof body.details === "object" && !Array.isArray(body.details)
    ? body.details as Record<string, unknown>
    : null;
  const nestedDetails = detailObject?.response && typeof detailObject.response === "object" && !Array.isArray(detailObject.response)
    ? detailObject.response as Record<string, unknown>
    : null;
  const stageValue = text(body.stage) ?? text(response?.stage);
  const stage = stageValue?.toLowerCase() ?? null;
  const outcome = text(body.outcome)?.toLowerCase() ?? null;
  const details = detailsText(detailObject?.errors)
    ?? detailsText(nestedDetails?.errors)
    ?? detailsText(body.errors)
    ?? detailsText(response?.details)
    ?? detailsText(response?.errors)
    ?? detailsText(nestedResponse?.details)
    ?? detailsText(nestedResponse?.errors)
    ?? detailsText(body.details);
  const serverMsg =
    text(body.error)
    ?? text(body.message)
    ?? text(response?.message)
    ?? text(nestedResponse?.message)
    ?? text(detailObject?.message)
    ?? text(body.response);

  if (outcome && UNKNOWN_OUTCOMES.has(outcome)) {
    return unconfirmed(
      `${submissionStageLabel(stage)} outcome is unconfirmed. Do not resubmit — refresh the invoice to check its status.`,
      stage, details,
    );
  }

  const confirmedFailure = outcome === "rejected"
    || outcome === "failed"
    || body.ok === false
    || response?.status === false
    || nestedResponse?.status === false;
  if (confirmedFailure) {
    if (outcome === "failed") {
      return {
        kind: "failed",
        stage,
        retrySafe: false,
        message: `${submissionStageLabel(stage)} failed${serverMsg ? `: ${serverMsg}` : "."} Do not resubmit until the status has been reviewed.`,
        details,
      };
    }

    const retrySafe = body.retry_safe === true;
    return {
      kind: "rejected",
      stage,
      retrySafe,
      message: `${submissionStageLabel(stage)} rejected${serverMsg ? `: ${serverMsg}` : "."}${retrySafe ? " Fix the issue and try again." : " Do not resubmit until the status has been reviewed."}`,
      details,
    };
  }

  if (body.ok === true && !invokeError) {
    return { kind: "success", stage, retrySafe: false, message: "Invoice validated and signed in the NRS sandbox. APP transmission and clearance are not performed by this flow.", details: null };
  }

  return unconfirmed(
    `${submissionStageLabel(stage)} outcome is unconfirmed. Do not resubmit — refresh the invoice to check its status.`,
    stage,
    details,
  );
}
