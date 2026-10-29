const round = (value: number) =>
  Math.round(value * 100) / 100;

export interface InvoiceAmountLine {
  qty: unknown;
  unit_price: unknown;
  discount_amount?: unknown;
  tax_rate?: unknown;
  tax_category?: unknown;
}

export interface InvoiceAmountHeader {
  subtotal: unknown;
  tax: unknown;
  total: unknown;
  discount_total?: unknown;
}

export function validateNrsInvoiceAmounts(
  invoice: InvoiceAmountHeader,
  lines: readonly InvoiceAmountLine[],
) {
  const amounts = lines.reduce(
    (totals, line) => {
      const quantity = Number(line.qty);
      const unitPrice = Number(line.unit_price);
      const discount = Number(line.discount_amount ?? 0);
      const taxRate = Number(line.tax_rate ?? 0);
      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > quantity * unitPrice ||
        !Number.isFinite(taxRate) ||
        taxRate < 0
      ) {
        return totals;
      }

      const net = quantity * unitPrice - discount;
      totals.subtotal += net;
      totals.discount += discount;
      if (String(line.tax_category ?? "S").toUpperCase() === "S") {
        totals.tax += net * taxRate / 100;
      }
      return totals;
    },
    { subtotal: 0, tax: 0, discount: 0 },
  );

  const declared = {
    subtotal: Number(invoice.subtotal),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    discount: Number(invoice.discount_total ?? 0),
  };
  if (
    Object.values(declared).some(
      (amount) => !Number.isFinite(amount) || amount < 0,
    )
  ) {
    return ["Invoice header amounts must be finite and non-negative"];
  }

  const tolerance = 0.02;
  const errors: string[] = [];
  if (Math.abs(declared.discount - amounts.discount) > tolerance) {
    errors.push("Invoice discount must match the total of line discounts");
  }
  if (Math.abs(declared.subtotal - amounts.subtotal) > tolerance) {
    errors.push("Invoice subtotal must match the net invoice line amounts");
  }
  if (Math.abs(declared.tax - amounts.tax) > tolerance) {
    errors.push("Invoice tax must match the invoice line tax amounts");
  }
  if (Math.abs(declared.total - (amounts.subtotal + amounts.tax)) > tolerance) {
    errors.push("Invoice total must equal the net subtotal plus tax");
  }
  return errors;
}

export function createNrsMonetaryTotals(
  netSubtotal: number,
  taxTotal: number,
) {
  const subtotal = round(netSubtotal);
  const tax = round(taxTotal);
  const inclusiveTotal = round(subtotal + tax);

  return {
    line_extension_amount: subtotal,
    tax_exclusive_amount: subtotal,
    tax_inclusive_amount: inclusiveTotal,
    payable_amount: inclusiveTotal,
  };
}
