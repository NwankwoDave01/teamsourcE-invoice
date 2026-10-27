import React from "react";
import { formatCurrency } from "@/lib/format";
import { resolveQrImageSource } from "@/lib/nrs/qrDisplay";

export interface PrintableInvoiceData {
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
  lines?: Array<{
    id?: string;
    description: string;
    qty: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
    unit_code?: string | null;
  }>;
}

export interface PrintableCompanyData {
  name: string;
  tin?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface PrintableInvoiceProps {
  invoices: PrintableInvoiceData[];
  company?: PrintableCompanyData | null;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoices, company }) => {
  return (
    <div className="printable-container print:w-full">
      {invoices.map((inv, idx) => {
        const currency = inv.currency || "NGN";
        const qrImg = resolveQrImageSource(inv.qr_code, inv.qr_code_data);

        return (
          <div
            key={inv.id || idx}
            className="printable-invoice-page bg-white text-slate-900 p-8 my-4 border border-slate-200 rounded-lg shadow-sm print:border-0 print:shadow-none print:p-0 print:my-0"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{company?.name || "TS-Flow Tenant"}</h1>
                {company?.tin && <p className="text-xs text-slate-500 mt-1">TIN: {company.tin}</p>}
                {company?.address && <p className="text-xs text-slate-500">{company.address}</p>}
                {(company?.email || company?.phone) && (
                  <p className="text-xs text-slate-500">
                    {[company?.email, company?.phone].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-bold uppercase tracking-wider text-primary">Invoice</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">{inv.number}</p>
                <p className="text-xs text-slate-500">Issue: {inv.issue_date}</p>
                <p className="text-xs text-slate-500">Due: {inv.due_date}</p>
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {inv.status}
                </span>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
                <p className="font-semibold text-sm text-slate-800">{inv.customer_name}</p>
                {inv.customer_tin && <p className="text-slate-500">TIN: {inv.customer_tin}</p>}
                {inv.customer_address && <p className="text-slate-500">{inv.customer_address}</p>}
              </div>
              <div className="text-right">
                {inv.po_reference && (
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-400 uppercase">PO Ref: </span>
                    {inv.po_reference}
                  </p>
                )}
                {inv.irn && (
                  <div className="mt-2">
                    <p className="font-bold text-slate-400 uppercase tracking-wider">IRN</p>
                    <p className="font-mono text-[10px] text-slate-600 break-all">{inv.irn}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line items table */}
            <table className="w-full text-xs mb-8 border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider text-left">
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">VAT</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(inv.lines || []).map((line, lIdx) => (
                  <tr key={line.id || lIdx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400">{lIdx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{line.description}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {line.qty} {line.unit_code ? line.unit_code : ""}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatCurrency(Number(line.unit_price), currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">{line.tax_rate}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(Number(line.line_total), currency)}
                    </td>
                  </tr>
                ))}
                {(!inv.lines || inv.lines.length === 0) && (
                  <tr>
                    <td className="py-2.5 px-3 text-slate-400">1</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">Invoice Items</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">1</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatCurrency(Number(inv.subtotal), currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">7.5%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(Number(inv.total), currency)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals & Notes */}
            <div className="grid grid-cols-2 gap-8 items-start border-t border-slate-200 pt-4">
              <div>
                {inv.notes && (
                  <div className="mb-4">
                    <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1">Notes</p>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{inv.notes}</p>
                  </div>
                )}
                {qrImg && (
                  <div className="mt-3">
                    <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1">
                      FIRS / NRS QR Verification
                    </p>
                    <img src={qrImg} alt="Invoice QR" className="h-20 w-20 object-contain border p-1 rounded" />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-medium tabular-nums">{formatCurrency(Number(inv.subtotal), currency)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tax / VAT:</span>
                  <span className="font-medium tabular-nums">{formatCurrency(Number(inv.tax), currency)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-bold border-t border-slate-200">
                  <span className="text-slate-900">Total:</span>
                  <span className="text-slate-900 tabular-nums">{formatCurrency(Number(inv.total), currency)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              <p>Generated by TS-Flow • FIRS/NRS Compliant E-Invoicing System</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
