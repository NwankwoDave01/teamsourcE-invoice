import { describe, expect, it } from "vitest";
import { INVOICE_TYPE_CODE, normalizeInvoiceTypeCode } from "@/lib/nrs/invoiceTypeCode";

describe("normalizeInvoiceTypeCode (mirrors deployed nrs-submit v83)", () => {
  it("maps missing/empty/whitespace values to 396", () => {
    expect(normalizeInvoiceTypeCode(undefined)).toBe("396");
    expect(normalizeInvoiceTypeCode(null)).toBe("396");
    expect(normalizeInvoiceTypeCode("")).toBe("396");
    expect(normalizeInvoiceTypeCode("   ")).toBe("396");
  });

  it("maps commercial and 380 to 396 (including with whitespace)", () => {
    expect(normalizeInvoiceTypeCode("commercial")).toBe("396");
    expect(normalizeInvoiceTypeCode(" commercial ")).toBe("396");
    expect(normalizeInvoiceTypeCode("380")).toBe("396");
    expect(normalizeInvoiceTypeCode(" 380 ")).toBe("396");
  });

  it("preserves supported numeric codes as-is", () => {
    expect(normalizeInvoiceTypeCode("381")).toBe("381");
    expect(normalizeInvoiceTypeCode(" 381 ")).toBe("381");
    expect(normalizeInvoiceTypeCode("383")).toBe("383");
    expect(normalizeInvoiceTypeCode(" 383 ")).toBe("383");
    expect(normalizeInvoiceTypeCode("384")).toBe("384");
    expect(normalizeInvoiceTypeCode(" 384 ")).toBe("384");
    expect(normalizeInvoiceTypeCode("325")).toBe("325");
    expect(normalizeInvoiceTypeCode(" 325 ")).toBe("325");
  });

  it("maps semantic aliases through the TYPE map", () => {
    expect(normalizeInvoiceTypeCode("credit_note")).toBe("381");
    expect(normalizeInvoiceTypeCode(" credit_note ")).toBe("381");
    expect(normalizeInvoiceTypeCode("debit_note")).toBe("383");
    expect(normalizeInvoiceTypeCode(" corrected ")).toBe("384");
    expect(normalizeInvoiceTypeCode("proforma")).toBe("325");
  });

  it("falls back to 396 for unknown values and unsupported numeric codes", () => {
    expect(normalizeInvoiceTypeCode("unknown_type")).toBe("396");
    expect(normalizeInvoiceTypeCode("999")).toBe("396");
    expect(normalizeInvoiceTypeCode(" 999 ")).toBe("396");
    expect(normalizeInvoiceTypeCode("38")).toBe("396");
    expect(normalizeInvoiceTypeCode("3800")).toBe("396");
    expect(normalizeInvoiceTypeCode("random_code")).toBe("396");
  });

  it("keeps the exported TYPE map aligned with the deployed contract", () => {
    expect(INVOICE_TYPE_CODE).toEqual({
      commercial: "396",
      credit_note: "381",
      debit_note: "383",
      corrected: "384",
      proforma: "325",
    });
  });
});
