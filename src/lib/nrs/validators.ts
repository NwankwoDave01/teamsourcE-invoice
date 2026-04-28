import type { NrsValidationIssue } from "./types";
import {
  ALLOWED_CURRENCIES,
  ALLOWED_TAX_CATEGORIES,
  ALLOWED_UNIT_CODES,
  ALLOWED_COUNTRY_CODES_RE,
  approxEqual,
  round2,
} from "./codes";

type AnyRow = Record<string, any>;

interface ValidateInput {
  invoice: AnyRow;
  lines: AnyRow[];
  company: AnyRow | null;
  customer: AnyRow | null;
}

function err(field: string, code: string, message: string): NrsValidationIssue {
  return { field, code, message, severity: "error" };
}
function warn(field: string, code: string, message: string): NrsValidationIssue {
  return { field, code, message, severity: "warning" };
}

// Lenient TIN check: any non-empty string that contains digits is accepted.
// Format issues are warnings, never blocking — until official NRS rules confirmed.
function checkTin(value: string | null | undefined, field: string, opts: { required: boolean }): NrsValidationIssue[] {
  const issues: NrsValidationIssue[] = [];
  if (!value || !value.trim()) {
    if (opts.required) issues.push(err(field, "TIN_REQUIRED", "TIN is required for NRS submission."));
    return issues;
  }
  const v = value.trim();
  if (!/\d/.test(v)) {
    issues.push(warn(field, "TIN_FORMAT", "TIN does not contain digits — please double-check."));
  } else if (v.length < 8) {
    issues.push(warn(field, "TIN_LENGTH", "TIN looks short. Verify with NRS records."));
  }
  return issues;
}

export function validateForNrs({ invoice, lines, company, customer }: ValidateInput): NrsValidationIssue[] {
  const issues: NrsValidationIssue[] = [];

  // ---------- Header required ----------
  if (!invoice.number) issues.push(err("invoice.number", "REQUIRED", "Invoice number is required."));
  if (!invoice.issue_date) issues.push(err("invoice.issue_date", "REQUIRED", "Issue date is required."));
  if (!invoice.due_date) issues.push(err("invoice.due_date", "REQUIRED", "Due date is required."));
  if (!invoice.customer_name) issues.push(err("invoice.customer_name", "REQUIRED", "Customer name is required."));
  if (!lines || lines.length === 0) issues.push(err("invoice.lines", "REQUIRED", "Invoice must have at least one line item."));

  // ---------- Currency ----------
  const currency = (invoice.currency ?? "NGN").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    issues.push(err("invoice.currency", "CURRENCY_FORMAT", "Currency must be a 3-letter ISO 4217 code."));
  } else if (!ALLOWED_CURRENCIES.has(currency)) {
    issues.push(warn("invoice.currency", "CURRENCY_UNKNOWN", `Currency ${currency} is not in the supported list.`));
  }
  if (currency !== "NGN" && (!invoice.exchange_rate || Number(invoice.exchange_rate) <= 0)) {
    issues.push(err("invoice.exchange_rate", "EXCHANGE_RATE", "Exchange rate is required when currency is not NGN."));
  }

  // ---------- Document type ----------
  if ((invoice.invoice_type === "credit_note" || invoice.invoice_type === "debit_note") && !invoice.original_invoice_id) {
    issues.push(err("invoice.original_invoice_id", "ORIGINAL_REF_REQUIRED",
      "Credit / debit notes must reference an original invoice."));
  }

  // ---------- Supplier (company) ----------
  if (!company) {
    issues.push(err("supplier", "COMPANY_MISSING", "Supplier company record could not be loaded."));
  } else {
    if (!company.name) issues.push(err("supplier.name", "REQUIRED", "Supplier name is required."));
    issues.push(...checkTin(company.tin, "supplier.tin", { required: true }));
    if (!company.legal_name) issues.push(warn("supplier.legal_name", "RECOMMENDED", "Supplier legal name is recommended."));
    if (!company.address_line1) issues.push(warn("supplier.address.line1", "RECOMMENDED", "Supplier street address is recommended."));
    if (!company.city) issues.push(warn("supplier.address.city", "RECOMMENDED", "Supplier city is recommended."));
    if (!company.state) issues.push(warn("supplier.address.state", "RECOMMENDED", "Supplier state is recommended."));
    const cc = (company.country_code ?? "NG").toUpperCase();
    if (!ALLOWED_COUNTRY_CODES_RE.test(cc)) {
      issues.push(err("supplier.address.countryCode", "COUNTRY_FORMAT", "Country code must be ISO 3166-1 alpha-2."));
    }
  }

  // ---------- Buyer (customer) ----------
  const buyerType = (customer?.buyer_type ?? "business") as string;
  if (!customer && !invoice.customer_name) {
    issues.push(err("buyer.name", "REQUIRED", "Buyer name is required."));
  }
  if (customer) {
    const tinRequired = buyerType === "business" || buyerType === "government";
    if (tinRequired) {
      issues.push(...checkTin(customer.tin, "buyer.tin", { required: false })); // soft for now
      if (!customer.tin) {
        issues.push(warn("buyer.tin", "TIN_RECOMMENDED",
          "Business / government buyers should have a TIN before NRS submission."));
      }
    }
    if (buyerType === "foreign") {
      const cc = (customer.country_code ?? "").toUpperCase();
      if (!cc || cc === "NG") {
        issues.push(warn("buyer.address.countryCode", "FOREIGN_COUNTRY",
          "Foreign buyers should have a non-NG country code."));
      }
    }
  }

  // ---------- Lines ----------
  let computedSubtotal = 0;
  let computedTaxTotal = 0;
  lines?.forEach((line, i) => {
    const path = `line[${i}]`;
    if (!line.description) issues.push(err(`${path}.description`, "REQUIRED", "Line description is required."));
    const qty = Number(line.qty ?? 0);
    const unitPrice = Number(line.unit_price ?? 0);
    const taxRate = Number(line.tax_rate ?? 0);
    const discount = Number(line.discount_amount ?? 0);
    if (qty <= 0) issues.push(err(`${path}.qty`, "QTY_INVALID", "Quantity must be greater than zero."));
    if (unitPrice < 0) issues.push(err(`${path}.unit_price`, "PRICE_NEGATIVE", "Unit price cannot be negative."));

    const unit = (line.unit_code ?? "EA").toUpperCase();
    if (!ALLOWED_UNIT_CODES.has(unit)) {
      issues.push(warn(`${path}.unit_code`, "UNIT_UNKNOWN",
        `Unit code "${unit}" is not in the supported UN/ECE list.`));
    }

    const cat = (line.tax_category ?? "S") as string;
    if (!ALLOWED_TAX_CATEGORIES.has(cat)) {
      issues.push(err(`${path}.tax_category`, "TAX_CATEGORY", "Tax category must be one of S, Z, E, O."));
    }

    const expectedNet = round2(qty * unitPrice - discount);
    const expectedTax = cat === "S" ? round2(expectedNet * (taxRate / 100)) : 0;
    const expectedLineTotal = round2(expectedNet + expectedTax);

    if (cat !== "S" && Number(line.tax_amount ?? 0) > 0) {
      issues.push(warn(`${path}.tax_amount`, "TAX_ON_NON_STANDARD",
        "Tax amount should be zero for Z / E / O tax categories."));
    }

    // If stored amounts exist, sanity check them.
    if (line.net_amount != null && !approxEqual(Number(line.net_amount), expectedNet)) {
      issues.push(warn(`${path}.net_amount`, "NET_MISMATCH",
        `Stored net (${line.net_amount}) differs from computed (${expectedNet}).`));
    }
    if (line.tax_amount != null && !approxEqual(Number(line.tax_amount), expectedTax)) {
      issues.push(warn(`${path}.tax_amount`, "TAX_MISMATCH",
        `Stored tax (${line.tax_amount}) differs from computed (${expectedTax}).`));
    }

    if (cat === "S" && !line.item_classification_code) {
      issues.push(warn(`${path}.item_classification_code`, "ITEM_CODE_RECOMMENDED",
        "Standard-rated lines should have an item classification (HS) code."));
    }

    computedSubtotal += expectedNet;
    computedTaxTotal += expectedTax;
    void expectedLineTotal;
  });

  // ---------- Header totals ----------
  const subtotal = Number(invoice.subtotal ?? 0);
  const tax = Number(invoice.tax ?? 0);
  const total = Number(invoice.total ?? 0);
  const discountTotal = Number(invoice.discount_total ?? 0);

  if (!approxEqual(subtotal, round2(computedSubtotal), 0.5)) {
    issues.push(warn("invoice.subtotal", "SUBTOTAL_MISMATCH",
      `Stored subtotal (${subtotal}) differs from computed (${round2(computedSubtotal)}).`));
  }
  if (!approxEqual(tax, round2(computedTaxTotal), 0.5)) {
    issues.push(warn("invoice.tax", "TAX_MISMATCH",
      `Stored tax (${tax}) differs from computed (${round2(computedTaxTotal)}).`));
  }
  const expectedTotal = round2(round2(computedSubtotal) + round2(computedTaxTotal) - discountTotal);
  if (!approxEqual(total, expectedTotal, 0.5)) {
    issues.push(warn("invoice.total", "TOTAL_MISMATCH",
      `Stored total (${total}) differs from computed (${expectedTotal}).`));
  }

  return issues;
}
