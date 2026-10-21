import { describe, it, expect } from "vitest";
import { formatCurrency, formatNGN } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats NGN amounts with two decimal places", () => {
    const formatted = formatCurrency(1250.5, "NGN");
    expect(formatted).toContain("1,250.50");
  });

  it("formats foreign currency codes cleanly", () => {
    const usd = formatCurrency(500, "USD");
    expect(usd).toContain("500.00");

    const eur = formatCurrency(99.99, "EUR");
    expect(eur).toContain("99.99");

    const gbp = formatCurrency(10.5, "GBP");
    expect(gbp).toContain("10.50");
  });

  it("handles zero and fallback formatting safely", () => {
    const zero = formatCurrency(0, "NGN");
    expect(zero).toContain("0.00");

    const custom = formatCurrency(123.45, "XYZ");
    expect(custom).toContain("123.45");
  });

  it("preserves formatNGN backwards compatibility", () => {
    const ngn = formatNGN(1250.75);
    expect(ngn).toContain("1,251");
  });
});
