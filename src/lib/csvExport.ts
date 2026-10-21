/**
 * Utilities for escaping and generating CSV data for exports.
 */

/**
 * Escapes a single CSV field value according to RFC 4180.
 * If the value contains commas, double quotes, or newlines, it is enclosed
 * in double quotes and existing double quotes are doubled.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface InvoiceCsvExportRow {
  number: string;
  customer_name: string;
  issue_date: string;
  due_date: string;
  currency?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total: number | string;
  status: string;
  irn?: string | null;
  invoice_type?: string | null;
  po_reference?: string | null;
  notes?: string | null;
}

export function generateInvoicesCsv(invoices: InvoiceCsvExportRow[]): string {
  const headers = [
    "Invoice Number",
    "Customer Name",
    "Issue Date",
    "Due Date",
    "Currency",
    "Subtotal",
    "Tax",
    "Total",
    "Status",
    "IRN",
    "Invoice Type",
    "PO Reference",
    "Notes",
  ];

  const rows = invoices.map((inv) => [
    escapeCsvCell(inv.number),
    escapeCsvCell(inv.customer_name),
    escapeCsvCell(inv.issue_date),
    escapeCsvCell(inv.due_date),
    escapeCsvCell(inv.currency ?? "NGN"),
    escapeCsvCell(inv.subtotal ?? ""),
    escapeCsvCell(inv.tax ?? ""),
    escapeCsvCell(inv.total),
    escapeCsvCell(inv.status),
    escapeCsvCell(inv.irn ?? ""),
    escapeCsvCell(inv.invoice_type ?? ""),
    escapeCsvCell(inv.po_reference ?? ""),
    escapeCsvCell(inv.notes ?? ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

export function downloadCsv(csvContent: string, filename: string): void {
  // Prepend \uFEFF UTF-8 BOM so Excel and spreadsheet applications properly render characters
  const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Asynchronously clean up after browser initiates download
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}
