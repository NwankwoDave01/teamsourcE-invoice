ALTER TABLE public.invoices
  ALTER COLUMN invoice_type DROP DEFAULT;

ALTER TABLE public.invoices
  ALTER COLUMN invoice_type TYPE text
  USING CASE invoice_type::text
    WHEN 'commercial' THEN '381'
    WHEN 'credit_note' THEN '380'
    WHEN 'debit_note' THEN '384'
    WHEN 'proforma' THEN '390'
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
