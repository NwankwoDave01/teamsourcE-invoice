// NRS / FIRS e-invoicing — internal UBL-style mapping types.
// NOTE: This is an INTERNAL preview structure. It is NOT yet the final
// payload accepted by the live NRS API. We will reconcile with the official
// schema before real integration.

export type NrsSeverity = "error" | "warning";

export interface NrsValidationIssue {
  field: string;
  code: string;
  message: string;
  severity: NrsSeverity;
}

export interface NrsAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  lga?: string | null;
  postcode?: string | null;
  countryCode: string;
}

export interface NrsParty {
  tin?: string | null;
  vatNumber?: string | null;
  rcNumber?: string | null;
  legalName?: string | null;
  tradeName: string;
  email?: string | null;
  phone?: string | null;
  address: NrsAddress;
}

export interface NrsBuyer extends NrsParty {
  buyerType: "business" | "individual" | "government" | "foreign";
}

export interface NrsLine {
  lineUuid: string;
  position: number;
  itemCode?: string | null;
  itemName: string;
  description: string;
  unitCode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  netAmount: number;
  taxCategory: string;
  taxScheme: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface NrsTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
}

export interface NrsInvoicePayload {
  documentUuid: string;
  invoiceNumber: string;
  invoiceTypeCode: string;
  transactionType: "B2B" | "B2C" | "B2G" | "export";
  issueDate: string;
  dueDate: string;
  supplyDate?: string | null;
  currencyCode: string;
  exchangeRate: number;
  supplier: NrsParty;
  buyer: NrsBuyer;
  paymentMeansCode?: string | null;
  paymentTerms?: string | null;
  poReference?: string | null;
  notes?: string | null;
  lines: NrsLine[];
  totals: NrsTotals;
}

export interface NrsBuildResult {
  payload: NrsInvoicePayload | null;
  issues: NrsValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

// Map internal invoice_type enum -> NRS UBL type code (placeholder mapping).
export const INVOICE_TYPE_CODE: Record<string, string> = {
  commercial: "380",
  credit_note: "381",
  debit_note: "383",
  corrected: "384",
  proforma: "325",
};
