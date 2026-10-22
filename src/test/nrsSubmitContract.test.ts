import { describe, expect, it } from "vitest";
import { parseSubmitResult } from "@/lib/nrs/submitContract";

describe("nrs-submit result handling", () => {
  it("success only when ok is true", async () => {
    expect((await parseSubmitResult({ ok: true, stage: "sign", outcome: "signed" }, null)).kind).toBe("success");
  });
  it("does not report success when the response also contains a rejection", async () => {
    expect(await parseSubmitResult({
      ok: true,
      stage: "validate",
      outcome: "rejected",
      response: { status: false, message: "Validation failed" },
    }, null)).toMatchObject({ kind: "rejected" });
  });
  it("parses the checked-in Edge Function validation rejection, even with an invoke error", async () => {
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
          message: "billingreference is required for credit note and debit note invoices",
        }],
      },
    }, new Error("FunctionsHttpError"));

    expect(result).toMatchObject({
      kind: "rejected",
      stage: "validate",
      message: expect.stringContaining("NRS validation rejected: Invoice validation failed"),
      details: expect.stringContaining("invoicerequest.invoice.billingreference: [REQUIRED] billingreference is required"),
    });
  });
  it("reads confirmed non-2xx rejection details from the Supabase function response", async () => {
    const error = {
      context: new Response(JSON.stringify({
        ok: false,
        stage: "local_validation",
        outcome: "rejected",
        error: "Invoice type is required.",
        errors: [{ field: "invoice.invoice_type", code: "INVOICE_TYPE_REQUIRED", message: "Invoice type is required." }],
      }), { status: 400, headers: { "Content-Type": "application/json" } }),
    };

    await expect(parseSubmitResult(null, error)).resolves.toMatchObject({
      kind: "rejected",
      stage: "local_validation",
      details: expect.stringContaining("INVOICE_TYPE_REQUIRED"),
    });
  });
  it("a 2xx body with ok:false is not success", async () => {
    expect((await parseSubmitResult({ ok: false, stage: "validate", outcome: "rejected", retry_safe: true }, null)).kind).toBe("rejected");
  });
  it("missing ok is unconfirmed and not retryable", async () => {
    const r = await parseSubmitResult({ stage: "sign" }, null);
    expect(r.kind).toBe("unconfirmed");
    expect(r.retrySafe).toBe(false);
  });
  it("genuinely indeterminate invoke error or empty body is unconfirmed", async () => {
    expect((await parseSubmitResult(null, new Error("network"))).kind).toBe("unconfirmed");
    expect((await parseSubmitResult(undefined, null)).kind).toBe("unconfirmed");
    expect((await parseSubmitResult("not json", null)).kind).toBe("unconfirmed");
  });
  it("unknown outcome is unconfirmed even with ok:false", async () => {
    expect(await parseSubmitResult({ ok: false, outcome: "unknown", retry_safe: true }, null)).toMatchObject({ kind: "unconfirmed", retrySafe: false });
  });
  it("retry is allowed only when retry_safe is explicitly true", async () => {
    expect((await parseSubmitResult({ ok: false, stage: "sign", outcome: "rejected" }, null)).retrySafe).toBe(false);
    expect((await parseSubmitResult({ ok: false, stage: "validate", outcome: "rejected", retry_safe: true }, null)).retrySafe).toBe(true);
  });
  it("does not report a confirmed transmission failure as an unknown result", async () => {
    expect(await parseSubmitResult({
      ok: false,
      stage: "transmit",
      outcome: "failed",
      response: { message: "Ledger unavailable" },
    }, null)).toMatchObject({ kind: "failed", stage: "transmit", message: expect.stringContaining("Ledger unavailable") });
  });
});
