/**
 * Strict local NRS validation (SI role).
 *
 * The SI layer is responsible for invoice standardisation: nothing may reach
 * /api/v1/invoice/validate or /api/v1/invoice/sign unless it is structurally
 * complete. These checks are BLOCKING (severity "error"); soft-quality hints
 * stay in the lenient preview validator (src/lib/nrs/validators.ts).
 *
 * Shared by the Edge Function and the browser preview so both agree.
 */
import { normalizeTaxCategory } from "./taxCategory.ts";
import { deriveInvoiceKind, round2 } from "./nrsMap.ts";

export type StrictSeverity = "error" | "warning";

export interface StrictIssue {
  field: string;
  code: string;
  message: string;
  severity: StrictSeverity;
}

type AnyRow = Record<string, unknown>;

export interface StrictInput {
  invoice: AnyRow;
  lines: AnyRow[];
  company: AnyRow | null;
  customer: AnyRow | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const e = (field: string, code: string, message: string): StrictIssue => ({ field, code, message, severity: "error" });
const w = (field: string, code: string, message: string): StrictIssue => ({ field, code, message, severity: "warning" });

function requireTin(value: unknown, field: string, label: string): StrictIssue[] {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return [e(field, "TIN_REQUIRED", `${label} TIN is required for NRS submission.`)];
  if (!/\d/.test(v)) return [e(field, "TIN_INVALID", `${label} TIN must contain digits.`)];
  if (v.replace(/\D/g, "").length < 8) {
    return [w(field, "TIN_SHORT", `${label} TIN looks short — verify against NRS records.`)];
  }
  return [];
}

function requireEmail(value: unknown, field: string, label: string): StrictIssue[] {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return [e(field, "EMAIL_REQUIRED", `${label} email address is required for NRS submission.`)];
  if (!EMAIL_RE.test(v)) return [e(field, "EMAIL_INVALID", `${label} email address "${v}" is not valid.`)];
  return [];
}

export function validateForNrsStrict({ invoice, lines, company, customer }: StrictInput): StrictIssue[] {
  const issues: StrictIssue[] = [];

  // ---------------- company / SI configuration ----------------
  if (!company) {
    issues.push(e("supplier", "COMPANY_MISSING", "Supplier company record could not be loaded."));
  } else {
    if (!company.name && !company.legal_name) {
      issues.push(e("supplier.name", "REQUIRED", "Supplier name is required."));
    }
    issues.push(...requireTin(company.tin, "supplier.tin", "Supplier"));
    issues.push(...requireEmail(company.email, "supplier.email", "Supplier"));
    if (!String(company.nrs_business_id ?? "").trim()) {
      issues.push(e("company.nrs_business_id", "BUSINESS_ID_REQUIRED",
        "NRS Business ID is not configured. Add it in Settings → NRS Integration."));
    }
    if (!/^[A-Za-z0-9]{8}$/.test(String(company.nrs_service_id ?? "").trim())) {
      issues.push(e("company.nrs_service_id", "SERVICE_ID_REQUIRED",
        "NRS Service ID must be exactly 8 alphanumeric characters. Add it in Settings → NRS Integration."));
    }
    if (!String(company.address_line1 ?? "").trim()) {
      issues.push(e("supplier.address.line1", "REQUIRED", "Supplier street address is required."));
    }
    if (!String(company.city ?? "").trim()) {
      issues.push(e("supplier.address.city", "REQUIRED", "Supplier city is required."));
    }
    if (!/^[A-Z]{2}$/.test(String(company.country_code ?? "NG").toUpperCase())) {
      issues.push(e("supplier.address.country", "COUNTRY_INVALID", "Supplier country code must be ISO 3166-1 alpha-2."));
    }
  }

  // ---------------- invoice header ----------------
  const number = String(invoice?.number ?? "").trim();
  if (!number) {
    issues.push(e("invoice.number", "REQUIRED", "Invoice number is required."));
  } else if (!/^[A-Za-z0-9]+$/.test(number)) {
    issues.push(e("invoice.number", "NUMBER_INVALID",
      `Invoice number "${number}" must be alphanumeric only (no spaces, slashes or dashes) to build a valid IRN.`));
  }
  if (!invoice?.issue_date) issues.push(e("invoice.issue_date", "REQUIRED", "Issue date is required."));
  if (!invoice?.due_date) issues.push(e("invoice.due_date", "REQUIRED", "Due date is required."));

  const currency = String(invoice?.currency ?? "NGN").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    issues.push(e("invoice.currency", "CURRENCY_INVALID", "Currency must be a 3-letter ISO 4217 code."));
  }
  if (currency !== "NGN" && !(Number(invoice?.exchange_rate) > 0)) {
    issues.push(e("invoice.exchange_rate", "EXCHANGE_RATE_REQUIRED",
      "Exchange rate is required when the invoice currency is not NGN."));
  }

  // ---------------- buyer ----------------
  const buyerName = String(customer?.name ?? invoice?.customer_name ?? "").trim();
  if (!buyerName) issues.push(e("buyer.name", "REQUIRED", "Customer name is required."));
  const buyerType = String(customer?.buyer_type ?? "business").toLowerCase();
  issues.push(...requireEmail(customer?.email, "buyer.email", "Customer"));
  if (buyerType === "business" || buyerType === "government") {
    issues.push(...requireTin(customer?.tin, "buyer.tin", "Customer"));
  }

  // ---------------- lines ----------------
  if (!lines || lines.length === 0) {
    issues.push(e("invoice.lines", "REQUIRED", "Invoice must have at least one line item."));
  }

  let net = 0;
  let tax = 0;
  (lines ?? []).forEach((line, i) => {
    const path = `line[${i}]`;
    if (!String(line?.description ?? "").trim()) {
      issues.push(e(`${path}.description`, "REQUIRED", "Line description is required."));
    }
    const qty = Number(line?.qty ?? 0);
    const unitPrice = Number(line?.unit_price ?? 0);
    const discount = Number(line?.discount_amount ?? 0);
    const rate = Number(line?.tax_rate ?? 0);
    if (!(qty > 0)) issues.push(e(`${path}.qty`, "QTY_INVALID", "Quantity must be greater than zero."));
    if (unitPrice < 0) issues.push(e(`${path}.unit_price`, "PRICE_NEGATIVE", "Unit price cannot be negative."));
    if (discount < 0) issues.push(e(`${path}.discount_amount`, "DISCOUNT_NEGATIVE", "Discount cannot be negative."));
    if (!/^[A-Za-z0-9]{2,3}$/.test(String(line?.unit_code ?? "EA"))) {
      issues.push(e(`${path}.unit_code`, "UNIT_INVALID", "Unit code must be a 2–3 character UN/ECE Rec 20 code."));
    }

    const short = normalizeTaxCategory(line?.tax_category);
    if (!short) {
      issues.push(e(`${path}.tax_category`, "TAX_CATEGORY_INVALID",
        `Tax category "${String(line?.tax_category ?? "")}" is not an NRS tax category. Use S (standard), Z (zero-rated), E (exempt) or O (out of scope). Product classification values such as LOCAL_SALES_TAX belong in the item classification fields, not the tax category.`));
    } else if (short === "S" && !(rate > 0)) {
      issues.push(e(`${path}.tax_rate`, "TAX_RATE_REQUIRED", "Standard-rated lines require a tax rate above zero."));
    }

    const lineNet = round2(qty * unitPrice - discount);
    net = round2(net + lineNet);
    if (short === "S") tax = round2(tax + round2(lineNet * (rate / 100)));
  });

  // ---------------- totals ----------------
  const discountTotal = Number(invoice?.discount_total ?? 0);
  const expectedTotal = round2(net + tax - discountTotal);
  if (invoice?.total != null && Math.abs(round2(Number(invoice.total)) - expectedTotal) > 0.02) {
    issues.push(e("invoice.total", "TOTAL_MISMATCH",
      `Stored invoice total (${round2(Number(invoice.total))}) does not match the recalculated total (${expectedTotal}). Re-save the invoice lines.`));
  }

  // ---------------- invoice kind ----------------
  const kind = deriveInvoiceKind(invoice ?? {}, lines ?? []);
  if (!["PRODUCT", "SERVICE", "MIXED"].includes(kind)) {
    issues.push(e("invoice.invoice_kind", "INVOICE_KIND_REQUIRED",
      "Invoice kind must resolve to PRODUCT, SERVICE or MIXED. Set a product category on each line."));
  }

  return issues;
}

export function hasStrictErrors(issues: StrictIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
