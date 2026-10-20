import { describe, expect, it } from "vitest";
import { INVOICE_TYPE_CODE, normalizeInvoiceTypeCode } from "@/lib/nrs/invoiceTypeCode";

describe("normalizeInvoiceTypeCode (mirrors deployed nrs-submit v82)", () => {
  it("maps missing/empty values to 380", () => {
    expect(normalizeInvoiceTypeCode(undefined)).toBe("380");
    expect(normalizeInvoiceTypeCode(null)).toBe("380");
    expect(normalizeInvoiceTypeCode("")).toBe("380");
    expect(normalizeInvoiceTypeCode("   ")).toBe("380");
  });

  it("maps commercial to 380", () => {
    expect(normalizeInvoiceTypeCode("commercial")).toBe("380");
  });

  it("preserves three-digit numeric codes as-is", () => {
    expect(normalizeInvoiceTypeCode("380")).toBe("380");
    expect(normalizeInvoiceTypeCode("381")).toBe("381");
    expect(normalizeInvoiceTypeCode("383")).toBe("383");
    expect(normalizeInvoiceTypeCode("384")).toBe("384");
    expect(normalizeInvoiceTypeCode("325")).toBe("325");
  });

  it("maps semantic aliases through the TYPE map", () => {
    expect(normalizeInvoiceTypeCode("credit_note")).toBe("381");
    expect(normalizeInvoiceTypeCode("debit_note")).toBe("383");
    expect(normalizeInvoiceTypeCode("corrected")).toBe("384");
    expect(normalizeInvoiceTypeCode("proforma")).toBe("325");
  });

  it("falls back to 380 for unknown values", () => {
    expect(normalizeInvoiceTypeCode("unknown_type")).toBe("380");
    expect(normalizeInvoiceTypeCode("38")).toBe("380");
    expect(normalizeInvoiceTypeCode("3800")).toBe("380");
  });

  it("keeps the exported TYPE map aligned with the deployed contract", () => {
    expect(INVOICE_TYPE_CODE).toEqual({
      commercial: "380",
      credit_note: "381",
      debit_note: "383",
      corrected: "384",
      proforma: "325",
    });
  });
});
