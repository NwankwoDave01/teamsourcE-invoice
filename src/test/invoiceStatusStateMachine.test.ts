import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261029140800_enforce_invoice_status_state_machine.sql"),
  "utf8",
);
const invoiceDetails = readFileSync(
  resolve(process.cwd(), "src/pages/tenant/InvoiceDetails.tsx"),
  "utf8",
);

describe("invoice status state machine", () => {
  it("reserves NRS compliance status changes for the submission service", () => {
    expect(migration).toMatch(/auth\.role\(\) = 'service_role'/);
    expect(migration).toMatch(/'Submitted'::public\.invoice_status[\s\S]*'Validated'::public\.invoice_status[\s\S]*'Signed'::public\.invoice_status[\s\S]*'Confirmed'::public\.invoice_status/);
    expect(migration).toMatch(/BEFORE INSERT OR UPDATE OF status ON public\.invoices/);
  });

  it("allows only normal workflow transitions to authenticated managers", () => {
    expect(migration).toMatch(/OLD\.status = 'Draft'[\s\S]*NEW\.status IN[\s\S]*'Ready'/);
    expect(migration).toMatch(/OLD\.status = 'In Review'[\s\S]*'Approved'[\s\S]*'Ready'[\s\S]*'Draft'/);
    expect(migration).toMatch(/OLD\.status = 'Approved'[\s\S]*'Ready'[\s\S]*'Draft'/);
    expect(migration).toMatch(/OLD\.status = 'Ready'[\s\S]*'Draft'[\s\S]*'Rejected'/);
  });

  it("keeps the rejection control out of NRS compliance states", () => {
    expect(invoiceDetails).toMatch(/MANUAL_REJECTION_STATUSES[\s\S]*"Draft"[\s\S]*"In Review"[\s\S]*"Approved"[\s\S]*"Ready"/);
    expect(invoiceDetails).toMatch(/canManage && MANUAL_REJECTION_STATUSES\.includes\(invoice\.status\)/);
  });
});
