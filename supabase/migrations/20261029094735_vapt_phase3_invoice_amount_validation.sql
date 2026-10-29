-- VAPT W5: enforce invoice amount consistency and bounded free text on every write.
-- Existing rows are not rewritten by this migration; constraints are NOT VALID so legacy
-- data can be reviewed and reconciled separately without destructive changes.
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_subtotal_nonnegative_vapt CHECK (subtotal >= 0) NOT VALID,
  ADD CONSTRAINT invoices_tax_nonnegative_vapt CHECK (tax >= 0) NOT VALID,
  ADD CONSTRAINT invoices_total_nonnegative_vapt CHECK (total >= 0) NOT VALID,
  ADD CONSTRAINT invoices_discount_nonnegative_vapt CHECK (COALESCE(discount_total, 0) >= 0) NOT VALID,
  ADD CONSTRAINT invoices_amounts_consistent_vapt
    CHECK (abs(total - (subtotal + tax)) <= 0.02) NOT VALID,
  ADD CONSTRAINT invoices_notes_length_vapt CHECK (length(COALESCE(notes, '')) <= 10000) NOT VALID,
  ADD CONSTRAINT invoices_po_reference_length_vapt CHECK (length(COALESCE(po_reference, '')) <= 500) NOT VALID,
  ADD CONSTRAINT invoices_customer_name_length_vapt CHECK (length(customer_name) <= 500) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_invoice_integrity_vapt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.subtotal < 0 OR NEW.tax < 0 OR NEW.total < 0 OR COALESCE(NEW.discount_total, 0) < 0 THEN
    RAISE EXCEPTION 'Invoice amounts cannot be negative'
      USING ERRCODE = '23514';
  END IF;

  -- In this schema subtotal is already net of line discounts; do not subtract discount_total again.
  IF abs(NEW.total - (NEW.subtotal + NEW.tax)) > 0.02 THEN
    RAISE EXCEPTION 'Invoice total must equal subtotal plus tax within rounding tolerance'
      USING ERRCODE = '23514';
  END IF;

  IF length(COALESCE(NEW.notes, '')) > 10000 THEN
    RAISE EXCEPTION 'Invoice notes exceed the 10000-character limit'
      USING ERRCODE = '23514';
  END IF;
  IF length(COALESCE(NEW.po_reference, '')) > 500 THEN
    RAISE EXCEPTION 'Purchase order reference exceeds the 500-character limit'
      USING ERRCODE = '23514';
  END IF;
  IF length(COALESCE(NEW.customer_name, '')) > 500 THEN
    RAISE EXCEPTION 'Customer name exceeds the 500-character limit'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_invoice_integrity_vapt ON public.invoices;
CREATE TRIGGER trg_validate_invoice_integrity_vapt
BEFORE INSERT OR UPDATE OF subtotal, tax, total, discount_total, notes, po_reference, customer_name
ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_integrity_vapt();

REVOKE ALL ON FUNCTION public.validate_invoice_integrity_vapt() FROM PUBLIC, anon, authenticated;
