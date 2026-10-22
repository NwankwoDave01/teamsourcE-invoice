import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NRS_INVOICE_TYPE_CODES } from "@/lib/nrs/invoiceTypeCode";

const migration = readFileSync(
  "supabase/migrations/20261022140000_correct_invoice_type_codes.sql",
  "utf8",
);

describe("invoice type correction migration safeguards", () => {
  it("aborts when any invoice type is NULL", () => {
    expect(migration).toMatch(/WHERE invoice_type IS NULL/);
    expect(migration).toMatch(/COALESCE\(quote_literal\(trim\(invoice_type::text\)\), 'NULL'\)/);
  });

  it("uses the same supported numeric invoice type codes as the frontend", () => {
    const guard = migration.match(/WHERE invoice_type IS NULL([\s\S]*?)\n    \);/)?.[1];
    expect(guard).toBeDefined();

    const guardedCodes = [...guard!.matchAll(/'(\d+)'/g)].map((match) => match[1]).sort();
    expect(guardedCodes).toEqual([...NRS_INVOICE_TYPE_CODES].sort());
    expect(guardedCodes).toContain("380");
    expect(guardedCodes).toContain("393");
  });

  it("removes unsupported legacy catalogue code 325 without rewriting numeric invoices", () => {
    expect(migration).toMatch(
      /DELETE FROM public\.nrs_master_data\s+WHERE resource_type = 'invoice-types'\s+AND code = '325';/,
    );
    expect(migration).toMatch(/ELSE invoice_type::text/);
    expect(migration).not.toMatch(/WHEN '380'|WHEN '393'/);
  });
});
