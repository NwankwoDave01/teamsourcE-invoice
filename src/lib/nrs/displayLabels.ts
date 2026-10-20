import type { NRSResource } from "@/hooks/useNrsMasterData";

/**
 * Frontend-only display labels for NRS master-data dropdowns.
 *
 * These helpers change ONLY the text a user sees in a <SelectItem>. They never
 * touch the `code` that is used as the select value, the form state, or the
 * payload, and they never write to nrs_master_data.
 */

/**
 * Explicit, frontend-only corrections for invoice-type rows whose stored
 * label/metadata are contradictory in nrs_master_data (verified by read-only
 * inspection): code 380 carries metadata.value "Credit Note" and code 381
 * carries "Commercial Invoice", i.e. the two are swapped. Codes are unchanged.
 */
export const INVOICE_TYPE_DISPLAY_LABELS: Record<string, string> = {
  "380": "Commercial Invoice",
  "381": "Credit Note",
  "383": "Debit Note",
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/** metadata.value when it is real text and not simply the code repeated back. */
function metadataValue(resource: NRSResource): string | null {
  const meta = asText(resource.metadata?.value);
  if (!meta) return null;
  if (meta.toLowerCase() === asText(resource.code)?.toLowerCase()) return null;
  return meta;
}

function labelOrCode(resource: NRSResource): string {
  const code = asText(resource.code) ?? "";
  const label = asText(resource.label);
  if (label && label.toLowerCase() !== code.toLowerCase()) return label;
  return code;
}

/** Display label for an invoice-type option. Value stays `resource.code`. */
export function invoiceTypeDisplayLabel(resource: NRSResource): string {
  const code = asText(resource.code) ?? "";

  const override = INVOICE_TYPE_DISPLAY_LABELS[code];
  if (override) return override;

  const meta = metadataValue(resource);
  if (meta) {
    // Another invoice-type code already owns this exact wording (e.g. 384 also
    // says "Debit Note"), so keep the list unambiguous by showing which code
    // this option actually carries.
    const ownedElsewhere = Object.entries(INVOICE_TYPE_DISPLAY_LABELS).some(
      ([ownedCode, ownedLabel]) =>
        ownedCode !== code && ownedLabel.toLowerCase() === meta.toLowerCase()
    );
    return ownedElsewhere ? `${meta} (${code})` : meta;
  }

  return labelOrCode(resource);
}

/** Display label for a payment-means option. Value stays `resource.code`. */
export function paymentMeansDisplayLabel(resource: NRSResource): string {
  return metadataValue(resource) ?? labelOrCode(resource);
}
