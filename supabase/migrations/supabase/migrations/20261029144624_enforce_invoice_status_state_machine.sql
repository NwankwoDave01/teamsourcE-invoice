CREATE OR REPLACE FUNCTION public.enforce_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'Draft'::public.invoice_status THEN
      RAISE EXCEPTION 'Invoices must be created as Draft'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN (
    'Submitted', 'Validated', 'Signed', 'Confirmed', 'Rejected'
  )
  OR NEW.status IN (
    'Submitted', 'Validated', 'Signed', 'Confirmed'
  ) THEN
    RAISE EXCEPTION
      'NRS compliance statuses can only be changed by the submission service'
      USING ERRCODE = '23514';
  END IF;

  IF NOT (
    (OLD.status = 'Draft' AND NEW.status IN ('In Review', 'Ready', 'Rejected'))
    OR (OLD.status = 'In Review' AND NEW.status IN ('Approved', 'Ready', 'Draft', 'Rejected'))
    OR (OLD.status = 'Approved' AND NEW.status IN ('Ready', 'Draft', 'Rejected'))
    OR (OLD.status = 'Ready' AND NEW.status IN ('Draft', 'Rejected'))
  ) THEN
    RAISE EXCEPTION
      'Invalid invoice status transition from % to %',
      OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_status_transition
ON public.invoices;

CREATE TRIGGER trg_enforce_invoice_status_transition
BEFORE INSERT OR UPDATE OF status
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invoice_status_transition();
