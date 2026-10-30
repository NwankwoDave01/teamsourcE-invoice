import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const submit = readFileSync(
  resolve(process.cwd(), "supabase/functions/nrs-submit/index.ts"),
  "utf8",
);
const qrRepair = readFileSync(
  resolve(process.cwd(), "supabase/functions/nrs-qr-repair/index.ts"),
  "utf8",
);

function assertNormalizedLookupResponses(source: string) {
  expect(source).toMatch(/if \(!invoice\)[\s\S]{0,180}Invoice not found or unavailable[\s\S]{0,80}404/);
  expect(source).toMatch(/if \(!allowed\)[\s\S]{0,180}Invoice not found or unavailable[\s\S]{0,80}404/);
  expect(source).toMatch(/if\s*\(\s*(?:authorizationError|permissionError)\s*\)[\s\S]{0,300}Invoice not found or unavailable[\s\S]{0,80}404/);
  expect(source).toMatch(/AUTHORIZATION_CHECK_FAILED/);
  expect(source).not.toMatch(/Invoice not found["']/);
  expect(source).not.toMatch(/error:\s*["']Forbidden["']/);
}

describe("invoice ID lookup response normalization", () => {
  it("uses the same status and body for missing and unauthorized nrs-submit invoices", () => {
    assertNormalizedLookupResponses(submit);
  });

  it("uses the same status and body for missing and unauthorized QR repair invoices", () => {
    assertNormalizedLookupResponses(qrRepair);
  });
});
