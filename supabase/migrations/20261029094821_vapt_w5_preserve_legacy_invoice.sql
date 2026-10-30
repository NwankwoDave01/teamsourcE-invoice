-- Preserve the legacy VAPT test invoice without silently rewriting production data.
-- The trigger validates amount consistency only when an amount field changes; text-length
-- checks remain enforced whenever their respective fields are written.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_amounts_consistent_vapt;

CREATE OR REPLACE FUNCTION public.validate_invoice_integrity_vapt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.subtotal < 0 OR NEW.tax < 0 OR NEW.total < 0 OR COALESCE(NEW.discount_total, 0) < 0 THEN
    RAISE EXCEPTION 'Invoice amounts cannot be negative' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.tax IS DISTINCT FROM OLD.tax
     OR NEW.total IS DISTINCT FROM OLD.total
     OR COALESCE(NEW.discount_total, 0) IS DISTINCT FROM COALESCE(OLD.discount_total, 0) THEN
    IF abs(NEW.total - (NEW.subtotal + NEW.tax)) > 0.02 THEN
      RAISE EXCEPTION 'Invoice total must equal subtotal plus tax within rounding tolerance'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF length(COALESCE(NEW.notes, '')) > 10000 THEN
    RAISE EXCEPTION 'Invoice notes exceed the 10000-character limit' USING ERRCODE = '23514';
  END IF;
  IF length(COALESCE(NEW.po_reference, '')) > 500 THEN
    RAISE EXCEPTION 'Purchase order reference exceeds the 500-character limit' USING ERRCODE = '23514';
  END IF;
  IF length(COALESCE(NEW.customer_name, '')) > 500 THEN
    RAISE EXCEPTION 'Customer name exceeds the 500-character limit' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
