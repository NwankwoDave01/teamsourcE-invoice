import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/format";

export interface PdfCompany {
  name: string;
  tin?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PdfLineItem {
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
  unit_code?: string | null;
}

export interface PdfInvoice {
  id: string;
  number: string;
  customer_name: string;
  customer_tin?: string | null;
  customer_address?: string | null;
  issue_date: string;
  due_date: string;
  currency?: string | null;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  status: string;
  irn?: string | null;
  qr_code?: string | null;
  qr_code_data?: string | null;
  notes?: string | null;
  po_reference?: string | null;
  lines?: PdfLineItem[];
}

export function generateInvoicePdf(invoice: PdfInvoice, company?: PdfCompany | null): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currency = invoice.currency || "NGN";
  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const secondaryColor: [number, number, number] = [100, 116, 139]; // slate-500

  // 1. Company Header (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text(company?.name || "TS-Flow Tenant", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  let y = 26;
  if (company?.tin) {
    doc.text(`TIN: ${company.tin}`, 14, y);
    y += 5;
  }
  if (company?.address) {
    doc.text(company.address, 14, y);
    y += 5;
  }
  if (company?.email || company?.phone) {
    doc.text([company?.email, company?.phone].filter(Boolean).join(" • "), 14, y);
    y += 5;
  }

  // 2. Invoice Meta (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text("INVOICE", 196, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(`Number: ${invoice.number}`, 196, 26, { align: "right" });
  doc.text(`Date: ${invoice.issue_date}`, 196, 31, { align: "right" });
  doc.text(`Due Date: ${invoice.due_date}`, 196, 36, { align: "right" });
  doc.text(`Status: ${invoice.status}`, 196, 41, { align: "right" });
  if (invoice.po_reference) {
    doc.text(`PO Ref: ${invoice.po_reference}`, 196, 46, { align: "right" });
  }

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 52, 196, 52);

  // 3. Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text("BILL TO", 14, 59);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text(invoice.customer_name, 14, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  let custY = 70;
  if (invoice.customer_tin) {
    doc.text(`TIN: ${invoice.customer_tin}`, 14, custY);
    custY += 5;
  }
  if (invoice.customer_address) {
    doc.text(invoice.customer_address, 14, custY);
    custY += 5;
  }

  // 4. Line Items Table
  const tableData = (invoice.lines || []).map((line, idx) => [
    String(idx + 1),
    line.description,
    String(line.qty) + (line.unit_code ? ` ${line.unit_code}` : ""),
    formatCurrency(Number(line.unit_price), currency),
    `${line.tax_rate}%`,
    formatCurrency(Number(line.line_total), currency),
  ]);

  if (tableData.length === 0) {
    tableData.push(["1", "Invoice Services / Items", "1", formatCurrency(Number(invoice.subtotal), currency), "7.5%", formatCurrency(Number(invoice.total), currency)]);
  }

  autoTable(doc, {
    startY: Math.max(custY + 3, 76),
    head: [["#", "Description", "Qty", "Unit Price", "VAT", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Totals Block
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  let totalsY = finalY + 8;

  const totalsBoxX = 120;
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text("Subtotal:", totalsBoxX, totalsY);
  doc.text(formatCurrency(Number(invoice.subtotal), currency), 196, totalsY, { align: "right" });

  totalsY += 6;
  doc.text("Tax / VAT:", totalsBoxX, totalsY);
  doc.text(formatCurrency(Number(invoice.tax), currency), 196, totalsY, { align: "right" });

  totalsY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX, totalsY - 2, 196, totalsY - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Total Amount:", totalsBoxX, totalsY + 3);
  doc.text(formatCurrency(Number(invoice.total), currency), 196, totalsY + 3, { align: "right" });

  // 6. Compliance Block (IRN and QR code only if legitimately present!)
  if (invoice.irn || invoice.qr_code || invoice.qr_code_data) {
    let compY = finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text("FIRS / NRS COMPLIANCE METRICS", 14, compY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    compY += 5;
    if (invoice.irn) {
      doc.text(`IRN: ${invoice.irn}`, 14, compY);
      compY += 4;
    }

    const qrData = invoice.qr_code_data || invoice.qr_code;
    if (qrData && qrData.startsWith("data:image")) {
      try {
        doc.addImage(qrData, "PNG", 14, compY + 2, 25, 25);
      } catch {
        // Safe fallback if image is not direct PNG
      }
    }
  }

  // 7. Notes
  if (invoice.notes) {
    const notesY = Math.max(totalsY + 14, finalY + 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text("NOTES", 14, notesY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(invoice.notes, 14, notesY + 4, { maxWidth: 100 });
  }

  // 8. Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Generated by TS-Flow • FIRS/NRS Compliant E-Invoicing System • Page ${i} of ${pageCount}`,
      105,
      287,
      { align: "center" },
    );
  }

  return doc;
}

export function downloadInvoicePdf(invoice: PdfInvoice, company?: PdfCompany | null): void {
  const doc = generateInvoicePdf(invoice, company);
  const safeNumber = invoice.number.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`invoice-${safeNumber}.pdf`);
}
