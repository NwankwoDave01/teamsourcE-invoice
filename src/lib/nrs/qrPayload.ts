/**
 * QR payload construction (shape only — the encryption itself is server-side).
 *
 * Per the Generate IRN document the QR content is the taxpayer-public-key
 * encrypted form of:
 *
 *   { "irn": "<IRN>.<unix timestamp>", "certificate": "<certificate>" }
 *
 * base64-encoded. This module keeps the *shape* in one testable place so the
 * Edge Function and the tests cannot drift.
 */

export interface QrClearPayload {
  irn: string;
  certificate: string;
}

export function buildTimestampedIrn(irn: string, unixTimestamp: number): string {
  if (!irn || typeof irn !== "string") throw new Error("IRN is required for QR generation");
  if (!Number.isFinite(unixTimestamp)) throw new Error("A numeric unix timestamp is required");
  return `${irn}.${Math.floor(unixTimestamp)}`;
}

export function buildQrClearPayload(
  irn: string,
  certificate: string,
  unixTimestamp: number,
): QrClearPayload {
  if (!certificate) throw new Error("Taxpayer certificate is required for QR generation");
  return { irn: buildTimestampedIrn(irn, unixTimestamp), certificate };
}

/** Deterministic JSON serialization of the clear payload before encryption. */
export function serializeQrClearPayload(payload: QrClearPayload): string {
  return JSON.stringify({ irn: payload.irn, certificate: payload.certificate });
}
