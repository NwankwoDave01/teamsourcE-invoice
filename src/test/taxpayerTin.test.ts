import { describe, expect, it } from "vitest";
import { isUsableTaxpayerTin, normalizeTaxpayerTin, taxpayerProfileIsComplete } from "@/lib/nrs/tin";

describe("taxpayer TIN readiness", () => {
  it("allows blank TINs during workspace setup and rejects known placeholders", () => {
    expect(normalizeTaxpayerTin("")).toBeNull();
    for (const tin of ["NG-PENDING", " pending ", "N/A", "00000000", "11111111", "abcdefgh"]) {
      expect(isUsableTaxpayerTin(tin)).toBe(false);
    }
    expect(normalizeTaxpayerTin("12345678")).toBe("12345678");
  });

  it("marks taxpayer profile complete only after TIN and required identity fields exist", () => {
    const profile = {
      tin: "12345678", legal_name: "Example Limited", email: "billing@example.com",
      address_line1: "1 Example Road", city: "Lagos", country_code: "NG",
    };
    expect(taxpayerProfileIsComplete(profile)).toBe(true);
    expect(taxpayerProfileIsComplete({ ...profile, tin: "NG-PENDING" })).toBe(false);
    expect(taxpayerProfileIsComplete({ ...profile, country_code: "Nigeria" })).toBe(false);
  });
});
