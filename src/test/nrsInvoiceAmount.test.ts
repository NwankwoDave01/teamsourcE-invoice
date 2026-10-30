import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createNrsMonetaryTotals,
  validateNrsInvoiceAmounts,
} from "../../supabase/functions/_shared/invoiceMonetaryTotals";

const submitFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/nrs-submit/index.ts"),
  "utf8",
);

describe("NRS invoice monetary totals", () => {
  it("counts a line discount once when calculating payable amount", () => {
    const totals = createNrsMonetaryTotals(90, 6.75);

    expect(totals).toEqual({
      line_extension_amount: 90,
      tax_exclusive_amount: 90,
      tax_inclusive_amount: 96.75,
      payable_amount: 96.75,
    });
  });

  it("rejects header discounts and totals that disagree with invoice lines", () => {
    const lines = [{
      qty: 1,
      unit_price: 100,
      discount_amount: 10,
      tax_rate: 7.5,
      tax_category: "S",
    }];
    expect(validateNrsInvoiceAmounts({
      subtotal: 90,
      tax: 6.75,
      total: 96.75,
      discount_total: 10,
    }, lines)).toEqual([]);
    expect(validateNrsInvoiceAmounts({
      subtotal: 90,
      tax: 6.75,
      total: 86.75,
      discount_total: 10,
    }, lines)).toContain("Invoice total must equal the net subtotal plus tax");
    expect(validateNrsInvoiceAmounts({
      subtotal: 90,
      tax: 6.75,
      total: 96.75,
      discount_total: 0,
    }, lines)).toContain("Invoice discount must match the total of line discounts");
  });

  it("uses the net invoice lines for the header total without a second allowance", () => {
    expect(submitFunction).toMatch(/legal_monetary_total:\s*createNrsMonetaryTotals\(\s*subtotal,\s*taxTotal,\s*\)/);
    expect(submitFunction).not.toMatch(/allowance_charge\s*:/);
  });
});
