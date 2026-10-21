import { describe, it, expect, vi } from "vitest";
import { escapeCsvCell, generateInvoicesCsv, downloadCsv } from "@/lib/csvExport";

describe("CSV Export Utilities", () => {
  describe("escapeCsvCell", () => {
    it("handles null and undefined safely", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("leaves normal strings and numbers unquoted", () => {
      expect(escapeCsvCell("INV-001")).toBe("INV-001");
      expect(escapeCsvCell(12500)).toBe("12500");
      expect(escapeCsvCell("Acme Corp")).toBe("Acme Corp");
    });

    it("escapes fields containing commas", () => {
      expect(escapeCsvCell("Lagos, Nigeria")).toBe('"Lagos, Nigeria"');
    });

    it("escapes fields containing double quotes by doubling them", () => {
      expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    });

    it("escapes fields containing newlines", () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("escapes combined commas, quotes, and newlines", () => {
      expect(escapeCsvCell('Header, with "quotes"\nand newlines')).toBe(
        '"Header, with ""quotes""\nand newlines"',
      );
    });
  });

  describe("generateInvoicesCsv", () => {
    it("generates correct CSV headers and data rows", () => {
      const rows = [
        {
          number: "INV-2026-001",
          customer_name: "Acme, Inc.",
          issue_date: "2026-10-01",
          due_date: "2026-10-15",
          currency: "NGN",
          subtotal: 139534.88,
          tax: 10465.12,
          total: 150000,
          status: "Draft",
          irn: null,
          invoice_type: "380",
          po_reference: "PO-001",
          notes: "Net 15 days",
        },
        {
          number: "INV-2026-002",
          customer_name: 'Tech "Global" Ltd',
          issue_date: "2026-10-02",
          due_date: "2026-10-16",
          currency: "USD",
          subtotal: 2325.58,
          tax: 174.42,
          total: 2500,
          status: "Confirmed",
          irn: "IRN-XYZ-12345",
          invoice_type: "396",
          po_reference: null,
          notes: null,
        },
      ];

      const csv = generateInvoicesCsv(rows);
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(
        "Invoice Number,Customer Name,Issue Date,Due Date,Currency,Subtotal,Tax,Total,Status,IRN,Invoice Type,PO Reference,Notes",
      );
      expect(lines[1]).toBe(
        'INV-2026-001,"Acme, Inc.",2026-10-01,2026-10-15,NGN,139534.88,10465.12,150000,Draft,,380,PO-001,Net 15 days',
      );
      expect(lines[2]).toBe(
        'INV-2026-002,"Tech ""Global"" Ltd",2026-10-02,2026-10-16,USD,2325.58,174.42,2500,Confirmed,IRN-XYZ-12345,396,,',
      );
    });

    it("defaults missing currency to NGN", () => {
      const rows = [
        {
          number: "INV-100",
          customer_name: "Customer",
          issue_date: "2026-10-01",
          due_date: "2026-10-10",
          currency: null,
          total: 1000,
          status: "Draft",
        },
      ];

      const csv = generateInvoicesCsv(rows);
      expect(csv).toContain("INV-100,Customer,2026-10-01,2026-10-10,NGN");
    });
  });

  describe("downloadCsv", () => {
    it("creates an anchor, triggers click, and revokes the object URL", () => {
      const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/test-blob");
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      vi.useFakeTimers();

      const clickMock = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");
      const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
        const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag);
        if (tag === "a") {
          el.click = clickMock;
        }
        return el;
      });

      downloadCsv("Col1,Col2\r\nVal1,Val2", "test-export.csv");

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();

      // Fast-forward timeout for cleanup and URL revocation
      vi.runAllTimers();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/test-blob");

      createElementSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
