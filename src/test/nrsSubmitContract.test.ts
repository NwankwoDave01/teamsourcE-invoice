import { describe, expect, it } from "vitest";
import { parseSubmitResult, submissionStageLabel } from "@/lib/nrs/submitContract";

describe("nrs-submit result handling", () => {
  it("reports success only for an explicit successful response", async () => {
    expect(await parseSubmitResult({ ok: true, stage: "sign", outcome: "signed" }, null))
      .toMatchObject({ kind: "success" });
  });

  it("does not report a contradictory rejection as success", async () => {
    expect(await parseSubmitResult({
      ok: true,
      stage: "validate",
      outcome: "rejected",
      response: { status: false, message: "Validation failed" },
    }, null)).toMatchObject({ kind: "rejected" });
  });

  it("parses nested NRS validation errors from a function error response", async () => {
    const error = {
      context: new Response(JSON.stringify({
        ok: false,
        stage: "nrs_validate",
        error: "Invoice validation failed",
        details: {
          status: false,
          errors: [{
            field: "invoicerequest.invoice.billingreference",
            code: "REQUIRED",
            message: "billingreference is required for credit note and debit note invoices",
          }],
        },
      }), { status: 422, headers: { "Content-Type": "application/json" } }),
    };

    const result = await parseSubmitResult(null, error);
    expect(result).toMatchObject({
      kind: "rejected",
      stage: "nrs_validate",
      message: expect.stringContaining("NRS validation rejected: Invoice validation failed"),
      details: expect.stringContaining("invoicerequest.invoice.billingreference: [REQUIRED] billingreference is required"),
    });
    expect(submissionStageLabel(result.stage)).toBe("NRS validation");
  });

  it("reads nested errors from the successful invoke data shape", async () => {
    const result = await parseSubmitResult({
      ok: false,
      stage: "validate",
      outcome: "rejected",
      response: {
        status: false,
        message: "Invoice validation failed",
        errors: [{
          field: "invoicerequest.invoice.billingreference",
          code: "REQUIRED",
          message: "billingreference is required",
        }],
      },
    }, new Error("FunctionsHttpError"));

    expect(result).toMatchObject({
      kind: "rejected",
      details: expect.stringContaining("billingreference is required"),
    });
  });

  it("treats missing or unreadable responses as unconfirmed", async () => {
    expect(await parseSubmitResult({ stage: "sign" }, null))
      .toMatchObject({ kind: "unconfirmed", retrySafe: false });
    expect(await parseSubmitResult(null, new Error("network")))
      .toMatchObject({ kind: "unconfirmed", retrySafe: false });
    expect(await parseSubmitResult(undefined, null))
      .toMatchObject({ kind: "unconfirmed", retrySafe: false });
    expect(await parseSubmitResult("not json", null))
      .toMatchObject({ kind: "unconfirmed", retrySafe: false });
  });

  it("keeps ambiguous outcomes unconfirmed even when ok is false", async () => {
    expect(await parseSubmitResult({ ok: false, outcome: "unknown", retry_safe: true }, null))
      .toMatchObject({ kind: "unconfirmed", retrySafe: false });
    expect(await parseSubmitResult({ ok: false, stage: "nrs_sign", outcome: "unknown" }, null))
      .toMatchObject({ kind: "unconfirmed", retrySafe: false });
  });

  it("does not treat failed outcomes as retry-safe", async () => {
    expect(await parseSubmitResult({
      ok: false,
      stage: "nrs_sign",
      outcome: "failed",
      retry_safe: true,
    }, null)).toMatchObject({ kind: "failed", retrySafe: false });
  });

  it("allows retries only when the server explicitly confirms them", async () => {
    expect(await parseSubmitResult({ ok: false, stage: "sign", outcome: "rejected" }, null))
      .toMatchObject({ kind: "rejected", retrySafe: false });
    expect(await parseSubmitResult({
      ok: false,
      stage: "validate",
      outcome: "rejected",
      retry_safe: true,
    }, null)).toMatchObject({ kind: "rejected", retrySafe: true });
  });
});
