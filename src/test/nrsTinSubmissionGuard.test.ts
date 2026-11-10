import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isUsableTaxpayerTin } from "../../supabase/functions/_shared/tin";

const edgeSource = readFileSync("supabase/functions/nrs-submit/index.ts", "utf8");
const validateInput = edgeSource.split("function validateInput(")[1]?.split("\nfunction buildPayload(")[0] ?? "";

describe("NRS taxpayer TIN submission gate", () => {
  it("rejects missing, blank, and placeholder TINs while allowing ordinary taxpayer identifiers", () => {
    for (const tin of [undefined, null, "", "   ", "NG-PENDING", "N/A", "PENDING", "00000000"]) {
      expect(isUsableTaxpayerTin(tin)).toBe(false);
    }
    expect(isUsableTaxpayerTin("1234567890")).toBe(true);
  });

  it("checks supplier and customer TINs in local validation before either external NRS request", () => {
    expect(validateInput).toContain("!isUsableTaxpayerTin(company?.tin)");
    expect(validateInput).toContain("!isUsableTaxpayerTin(customer?.tin)");
    const localValidation = edgeSource.indexOf("const localErrors =\n      validateInput(");
    const localFailure = edgeSource.indexOf("if (\n      localErrors.length", localValidation);
    const nrsValidateRequest = edgeSource.indexOf("/api/v1/invoice/validate", localFailure);
    const nrsSignRequest = edgeSource.indexOf("/api/v1/invoice/sign", nrsValidateRequest);
    expect(localValidation).toBeGreaterThan(0);
    expect(localFailure).toBeGreaterThan(localValidation);
    expect(nrsValidateRequest).toBeGreaterThan(localFailure);
    expect(nrsSignRequest).toBeGreaterThan(nrsValidateRequest);
  });
});
