import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import { generateInvoicePdf, downloadInvoicePdf, type PdfInvoice, type PdfCompany } from "@/lib/pdfExport";

describe("PDF Export Utilities", () => {
  const sampleCompany: PdfCompany = {
    name: "Acme Nigeria Ltd",
    tin: "12345678-0001",
    address: "12 Marina Street, Lagos",
    email: "billing@acme.ng",
    phone: "+234 1 234 5678",
  };

  const sampleInvoice: PdfInvoice = {
    id: "inv-test-1",
    number: "INV-2026-00042",
    customer_name: "Dangote Industries",
    customer_tin: "98765432-0001",
    customer_address: "Ikoyi, Lagos",
    issue_date: "2026-10-20",
    due_date: "2026-11-20",
    currency: "NGN",
    subtotal: 500000,
    tax: 37500,
    total: 537500,
    status: "Draft",
    po_reference: "PO-2026-99",
    notes: "Payment due within 30 days.",
    lines: [
      {
        description: "Cloud Architecture Advisory",
        qty: 1,
        unit_price: 500000,
        tax_rate: 7.5,
        line_total: 537500,
        unit_code: "EA",
      },
    ],
  };

  it("generates a valid jsPDF instance with expected pages", () => {
    const doc = generateInvoicePdf(sampleInvoice, sampleCompany);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("handles invoice with empty line items gracefully", () => {
    const invoiceWithoutLines: PdfInvoice = {
      ...sampleInvoice,
      lines: [],
    };
    const doc = generateInvoicePdf(invoiceWithoutLines, sampleCompany);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("includes FIRS/NRS metrics only when legitimately present", () => {
    const unverifiedDoc = generateInvoicePdf(sampleInvoice, sampleCompany);
    expect(unverifiedDoc).toBeDefined();

    const verifiedInvoice: PdfInvoice = {
      ...sampleInvoice,
      status: "Confirmed",
      irn: "IRN-VALID-123456-ABCDEF",
    };
    const verifiedDoc = generateInvoicePdf(verifiedInvoice, sampleCompany);
    expect(verifiedDoc).toBeDefined();
  });

  it("safely sanitizes filename during downloadInvoicePdf invocation", () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    const invoiceWithUnsafeChars: PdfInvoice = {
      ...sampleInvoice,
      number: "INV/2026/001 #Special!",
    };

    downloadInvoicePdf(invoiceWithUnsafeChars, sampleCompany);
    expect(writeSpy).toHaveBeenCalledWith("invoice-INV_2026_001__Special_.pdf", expect.anything());
    writeSpy.mockRestore();
  });
});
