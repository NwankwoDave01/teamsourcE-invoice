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
       'Submitted'::public.invoice_status,
       'Validated'::public.invoice_status,
       'Signed'::public.invoice_status,
       'Confirmed'::public.invoice_status,
       'Rejected'::public.invoice_status
     )
     OR NEW.status IN (
       'Submitted'::public.invoice_status,
       'Validated'::public.invoice_status,
       'Signed'::public.invoice_status,
       'Confirmed'::public.invoice_status
     ) THEN
    RAISE EXCEPTION 'NRS compliance statuses can only be changed by the submission service'
      USING ERRCODE = '23514';
  END IF;

  IF NOT (
    (OLD.status = 'Draft'::public.invoice_status
      AND NEW.status IN (
        'In Review'::public.invoice_status,
        'Ready'::public.invoice_status,
        'Rejected'::public.invoice_status
      ))
    OR (OLD.status = 'In Review'::public.invoice_status
      AND NEW.status IN (
        'Approved'::public.invoice_status,
        'Ready'::public.invoice_status,
        'Draft'::public.invoice_status,
        'Rejected'::public.invoice_status
      ))
    OR (OLD.status = 'Approved'::public.invoice_status
      AND NEW.status IN (
        'Ready'::public.invoice_status,
        'Draft'::public.invoice_status,
        'Rejected'::public.invoice_status
      ))
    OR (OLD.status = 'Ready'::public.invoice_status
      AND NEW.status IN (
        'Draft'::public.invoice_status,
        'Rejected'::public.invoice_status
      ))
  ) THEN
    RAISE EXCEPTION 'Invalid invoice status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_status_transition ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_status_transition
BEFORE INSERT OR UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invoice_status_transition();
