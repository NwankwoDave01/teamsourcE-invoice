/**
 * Utilities for escaping and generating CSV data for exports.
 */


/**
 * Escapes CSV fields and neutralises spreadsheet formula injection.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  let formulaAfterIgnorablePrefix = false;
  for (const character of str) {
    if (character.trim() === "" || character.charCodeAt(0) <= 0x1f) continue;
    formulaAfterIgnorablePrefix = ["=", "+", "-", "@"].includes(character);
    break;
  }

  // Prefix risky text with an apostrophe so spreadsheet apps
  // treat it as text rather than evaluating it as a formula.
  // Preserve numeric values, including legitimate negative numbers.
  const formulaRisk =
    typeof value === "string" &&
    (/^[\t\r\n]/.test(str) || formulaAfterIgnorablePrefix);

  const safeValue = formulaRisk ? `'${str}` : str;

  // Standard CSV quoting: double embedded quotes and quote fields
  // containing commas, quotes, or line breaks.
  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }

  return safeValue;
}

export function generateCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
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
    inv.number,
    inv.customer_name,
    inv.issue_date,
    inv.due_date,
    inv.currency ?? "NGN",
    inv.subtotal ?? "",
    inv.tax ?? "",
    inv.total,
    inv.status,
    inv.irn ?? "",
    inv.invoice_type ?? "",
    inv.po_reference ?? "",
    inv.notes ?? "",
  ]);

  return generateCsv(headers, rows);
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
