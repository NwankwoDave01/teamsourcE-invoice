import { describe, expect, it } from "vitest";
import {
  invoiceTypeDisplayLabel,
  paymentMeansDisplayLabel,
} from "@/lib/nrs/displayLabels";

// Rows shaped like nrs_master_data: code + label + metadata (metadata.value
// holds the description the taxpayer portal shows).
const row = (code: string, label: string, metadata?: Record<string, unknown> | null) => ({
  code,
  label,
  metadata: metadata === undefined ? null : metadata,
});

describe("invoiceTypeDisplayLabel", () => {
  it("applies the frontend override to the swapped 380/381 rows", () => {
    expect(invoiceTypeDisplayLabel(row("380", "380", { value: "Credit Note" }))).toBe(
      "Commercial Invoice"
    );
    expect(invoiceTypeDisplayLabel(row("381", "381", { value: "Commercial Invoice" }))).toBe(
      "Credit Note"
    );
    expect(invoiceTypeDisplayLabel(row("383", "Debit Note"))).toBe("Debit Note");
  });

  it("prefers metadata.value for codes without an override", () => {
    expect(invoiceTypeDisplayLabel(row("396", "396", { value: "Invoice Request" }))).toBe(
      "Invoice Request"
    );
  });

  it("does not show wording another invoice type already owns without naming the code", () => {
    expect(invoiceTypeDisplayLabel(row("384", "384", { value: "Debit Note" }))).toBe(
      "Debit Note (384)"
    );
  });

  it("falls back to label, then code, when metadata is missing, blank or repeats the code", () => {
    expect(invoiceTypeDisplayLabel(row("325", "Proforma Invoice"))).toBe("Proforma Invoice");
    expect(invoiceTypeDisplayLabel(row("456", "456", { value: "   " }))).toBe("456");
    expect(invoiceTypeDisplayLabel(row("457", "457", { value: "457" }))).toBe("457");
    expect(invoiceTypeDisplayLabel(row("777", "777"))).toBe("777");
    expect(invoiceTypeDisplayLabel(row("458", "458", { value: 458 }))).toBe("458");
  });
});

describe("paymentMeansDisplayLabel", () => {
  it("prefers the metadata.value description", () => {
    expect(paymentMeansDisplayLabel(row("10", "10", { value: "Cash" }))).toBe("Cash");
    expect(paymentMeansDisplayLabel(row("20", "20", { value: "Cheque" }))).toBe("Cheque");
    expect(paymentMeansDisplayLabel(row("30", "30", { value: "Credit Transfer" }))).toBe(
      "Credit Transfer"
    );
  });

  it("falls back to label, then code, when metadata is missing, blank or repeats the code", () => {
    expect(paymentMeansDisplayLabel(row("42", "Banker's Acceptance"))).toBe("Banker's Acceptance");
    expect(paymentMeansDisplayLabel(row("57", "57", { value: "57" }))).toBe("57");
    expect(paymentMeansDisplayLabel(row("58", "58", { value: "" }))).toBe("58");
    expect(paymentMeansDisplayLabel(row("59", "59"))).toBe("59");
  });
});
