LOCK TABLE public.invoices IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  unexpected_values TEXT;
BEGIN
  SELECT string_agg(DISTINCT quote_literal(trim(invoice_type::text)), ', ')
  INTO unexpected_values
  FROM public.invoices
  WHERE invoice_type IS NOT NULL
    AND (
      trim(invoice_type::text) = ''
      OR (
        trim(invoice_type::text) !~ '^[0-9]+$'
        AND lower(trim(invoice_type::text)) NOT IN (
          'commercial',
          'commercial_invoice',
          'credit_note',
          'credit-note',
          'credit note',
          'debit_note',
          'debit-note',
          'debit note',
          'proforma',
          'proforma_invoice'
        )
      )
    );

  IF unexpected_values IS NOT NULL THEN
    RAISE EXCEPTION
      'Unexpected invoice_type values require explicit mapping before migration: %',
      unexpected_values;
  END IF;
END;
$$;

ALTER TABLE public.invoices
  ALTER COLUMN invoice_type DROP DEFAULT;

ALTER TABLE public.invoices
  ALTER COLUMN invoice_type TYPE text
  USING CASE lower(trim(invoice_type::text))
    WHEN 'commercial' THEN '381'
    WHEN 'commercial_invoice' THEN '381'
    WHEN 'credit_note' THEN '380'
    WHEN 'credit-note' THEN '380'
    WHEN 'credit note' THEN '380'
    WHEN 'debit_note' THEN '384'
    WHEN 'debit-note' THEN '384'
    WHEN 'debit note' THEN '384'
    WHEN 'proforma' THEN '390'
    WHEN 'proforma_invoice' THEN '390'
    ELSE invoice_type::text
  END;

ALTER TABLE public.invoices
  ALTER COLUMN invoice_type SET DEFAULT '381';

UPDATE public.nrs_master_data
SET label = 'Credit Note'
WHERE resource_type = 'invoice-types'
  AND code = '380';

UPDATE public.nrs_master_data
SET label = 'Commercial Invoice'
WHERE resource_type = 'invoice-types'
  AND code = '381';

INSERT INTO public.nrs_master_data (resource_type, code, label, metadata)
VALUES ('invoice-types', '384', 'Debit Note', NULL)
ON CONFLICT (resource_type, code)
DO UPDATE SET label = EXCLUDED.label;

DELETE FROM public.nrs_master_data
WHERE resource_type = 'invoice-types'
  AND code = '383';
