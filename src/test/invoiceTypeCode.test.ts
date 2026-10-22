import { describe, expect, it } from "vitest";
import {
  INVOICE_TYPE_CODE,
  NRS_INVOICE_TYPE_CODES,
  normalizeInvoiceTypeCode,
} from "@/lib/nrs/invoiceTypeCode";

describe("normalizeInvoiceTypeCode", () => {
  it("preserves every supported code returned by the invoice-type resource", () => {
    expect(NRS_INVOICE_TYPE_CODES).toEqual([
      "380", "381", "384", "385", "386", "388", "389", "390", "392", "393",
      "394", "395", "396", "397", "399", "400", "402", "404", "406", "408",
    ]);
    for (const code of NRS_INVOICE_TYPE_CODES) {
      expect(normalizeInvoiceTypeCode(code)).toEqual({ valid: true, code });
    }
  });

  it("maps supported semantic aliases to their resource codes", () => {
    expect(normalizeInvoiceTypeCode("commercial")).toEqual({ valid: true, code: "381" });
    expect(normalizeInvoiceTypeCode("credit_note")).toEqual({ valid: true, code: "380" });
    expect(normalizeInvoiceTypeCode("debit_note")).toEqual({ valid: true, code: "384" });
    expect(normalizeInvoiceTypeCode("proforma")).toEqual({ valid: true, code: "390" });
    expect(normalizeInvoiceTypeCode("invoice_request")).toEqual({ valid: true, code: "396" });
  });

  it("returns explicit invalid results for missing and unsupported values", () => {
    expect(normalizeInvoiceTypeCode(undefined)).toEqual({ valid: false, reason: "missing" });
    expect(normalizeInvoiceTypeCode(null)).toEqual({ valid: false, reason: "missing" });
    expect(normalizeInvoiceTypeCode("")).toEqual({ valid: false, reason: "missing" });
    expect(normalizeInvoiceTypeCode("   ")).toEqual({ valid: false, reason: "missing" });
    expect(normalizeInvoiceTypeCode("383")).toEqual({ valid: false, reason: "unsupported" });
    expect(normalizeInvoiceTypeCode("325")).toEqual({ valid: false, reason: "unsupported" });
    expect(normalizeInvoiceTypeCode("unknown_type")).toEqual({ valid: false, reason: "unsupported" });
    expect(normalizeInvoiceTypeCode("38")).toEqual({ valid: false, reason: "unsupported" });
    expect(normalizeInvoiceTypeCode("3800")).toEqual({ valid: false, reason: "unsupported" });
  });

  it("keeps semantic aliases aligned with the invoice-type resource", () => {
    expect(INVOICE_TYPE_CODE).toEqual({
      commercial: "381",
      commercial_invoice: "381",
      credit_note: "380",
      debit_note: "384",
      self_billed_invoice: "385",
      factored_invoice: "386",
      statement_of_account: "388",
      purchase_order: "389",
      proforma: "390",
      proforma_invoice: "390",
      consignment_invoice: "392",
      self_billed_credit_note: "393",
      self_billed_invoice_debit_note: "394",
      credit_note_request: "395",
      invoice_request: "396",
      final_settlement: "397",
      bill_of_lading: "399",
      waybill: "400",
      shipping_instructions: "402",
      certificate_of_origin: "404",
      customs_declaration: "406",
      packing_list: "408",
    });
    for (const [alias, code] of Object.entries(INVOICE_TYPE_CODE)) {
      expect(normalizeInvoiceTypeCode(alias)).toEqual({ valid: true, code });
    }
  });
});
