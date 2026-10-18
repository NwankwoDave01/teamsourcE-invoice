import { describe, expect, it } from "vitest";
import { parseSubmitResult } from "@/lib/nrs/submitContract";

describe("nrs-submit result handling", () => {
  it("success only when ok is true", () => {
    expect(parseSubmitResult({ ok: true, stage: "sign", outcome: "signed" }, null).kind).toBe("success");
  });
  it("a 2xx body with ok:false is not success", () => {
    expect(parseSubmitResult({ ok: false, stage: "validate", outcome: "rejected", retry_safe: true }, null).kind).toBe("rejected");
  });
  it("missing ok is unconfirmed and not retryable", () => {
    const r = parseSubmitResult({ stage: "sign" }, null);
    expect(r.kind).toBe("unconfirmed");
    expect(r.retrySafe).toBe(false);
  });
  it("invoke error or empty body is unconfirmed", () => {
    expect(parseSubmitResult(null, new Error("network")).kind).toBe("unconfirmed");
    expect(parseSubmitResult(undefined, null).kind).toBe("unconfirmed");
    expect(parseSubmitResult("not json", null).kind).toBe("unconfirmed");
  });
  it("unknown outcome is unconfirmed even with ok:false", () => {
    expect(parseSubmitResult({ ok: false, outcome: "unknown", retry_safe: true }, null)).toMatchObject({ kind: "unconfirmed", retrySafe: false });
  });
  it("retry is allowed only when retry_safe is explicitly true", () => {
    expect(parseSubmitResult({ ok: false, stage: "sign", outcome: "rejected" }, null).retrySafe).toBe(false);
    expect(parseSubmitResult({ ok: false, stage: "validate", outcome: "rejected", retry_safe: true }, null).retrySafe).toBe(true);
  });
});
