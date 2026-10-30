import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const initialMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261029094735_vapt_phase3_invoice_amount_validation.sql"),
  "utf8",
);
const legacyMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261029094821_vapt_w5_preserve_legacy_invoice.sql"),
  "utf8",
);

describe("reconciled W5 invoice integrity migrations", () => {
  it("preserves the deployed non-negative, text-limit, and initial reconciliation constraints", () => {
    expect(initialMigration).toMatch(/subtotal >= 0\) NOT VALID/);
    expect(initialMigration).toMatch(/tax >= 0\) NOT VALID/);
    expect(initialMigration).toMatch(/total >= 0\) NOT VALID/);
    expect(initialMigration).toMatch(/COALESCE\(discount_total, 0\) >= 0\) NOT VALID/);
    expect(initialMigration).toMatch(/abs\(total - \(subtotal \+ tax\)\) <= 0\.02\) NOT VALID/);
    expect(initialMigration).toMatch(/length\(COALESCE\(notes, ''\)\) <= 10000\) NOT VALID/);
    expect(initialMigration).toMatch(/length\(COALESCE\(po_reference, ''\)\) <= 500\) NOT VALID/);
    expect(initialMigration).toMatch(/length\(customer_name\) <= 500\) NOT VALID/);
  });

  it("reconciles totals on insert or amount changes without double-subtracting discounts", () => {
    expect(initialMigration).toMatch(/subtotal is already net of line discounts/);
    expect(legacyMigration).toMatch(/DROP CONSTRAINT IF EXISTS invoices_amounts_consistent_vapt/);
    expect(legacyMigration).toMatch(/IF TG_OP = 'INSERT'[\s\S]*NEW\.subtotal IS DISTINCT FROM OLD\.subtotal[\s\S]*NEW\.tax IS DISTINCT FROM OLD\.tax[\s\S]*NEW\.total IS DISTINCT FROM OLD\.total[\s\S]*COALESCE\(NEW\.discount_total, 0\) IS DISTINCT FROM COALESCE\(OLD\.discount_total, 0\)/);
    expect(legacyMigration).toMatch(/abs\(NEW\.total - \(NEW\.subtotal \+ NEW\.tax\)\) > 0\.02/);
  });

  it("keeps negative-amount and text limits while allowing unrelated legacy-row edits", () => {
    expect(legacyMigration).toMatch(/NEW\.subtotal < 0 OR NEW\.tax < 0 OR NEW\.total < 0 OR COALESCE\(NEW\.discount_total, 0\) < 0/);
    expect(legacyMigration).toMatch(/length\(COALESCE\(NEW\.notes, ''\)\) > 10000/);
    expect(legacyMigration).toMatch(/length\(COALESCE\(NEW\.po_reference, ''\)\) > 500/);
    expect(legacyMigration).toMatch(/length\(COALESCE\(NEW\.customer_name, ''\)\) > 500/);
    expect(legacyMigration).not.toMatch(/UPDATE\s+public\.invoices|DELETE\s+FROM\s+public\.invoices/i);
    expect(legacyMigration).not.toMatch(/invoices_amounts_consistent_vapt\s+CHECK/i);
  });
});
