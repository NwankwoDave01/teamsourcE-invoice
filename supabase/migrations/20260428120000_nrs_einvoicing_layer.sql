-- NRS / FIRS e-invoicing mapping layer (additive, non-breaking).
-- All new columns are nullable or have safe defaults. No existing column is
-- altered or dropped. No data migration required.

-- 1. New enums --------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.nrs_invoice_type AS ENUM ('commercial','credit_note','debit_note','corrected','proforma');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nrs_transaction_type AS ENUM ('B2B','B2C','B2G','export');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nrs_tax_category AS ENUM ('S','Z','E','O');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nrs_buyer_type AS ENUM ('business','individual','government','foreign');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nrs_submission_status AS ENUM ('not_submitted','pending','validated','rejected','timeout','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. companies --------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS rc_number text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS lga text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS industry_code text;

-- 3. customers --------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS buyer_type public.nrs_buyer_type DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS rc_number text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS lga text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'NG';

-- 4. products ---------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS item_classification_code text,
  ADD COLUMN IF NOT EXISTS unit_code text DEFAULT 'EA',
  ADD COLUMN IF NOT EXISTS tax_category public.nrs_tax_category DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS tax_scheme text DEFAULT 'VAT',
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'goods';

-- 5. invoices ---------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_uuid uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invoice_type public.nrs_invoice_type DEFAULT 'commercial',
  ADD COLUMN IF NOT EXISTS transaction_type public.nrs_transaction_type DEFAULT 'B2B',
  ADD COLUMN IF NOT EXISTS original_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS supply_date date,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS payment_means_code text DEFAULT '30',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submission_status public.nrs_submission_status DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS submission_response jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_code_data text,
  ADD COLUMN IF NOT EXISTS csid text;

-- 6. invoice_lines ----------------------------------------------------------
ALTER TABLE public.invoice_lines
  ADD COLUMN IF NOT EXISTS line_uuid uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS item_classification_code text,
  ADD COLUMN IF NOT EXISTS unit_code text DEFAULT 'EA',
  ADD COLUMN IF NOT EXISTS tax_category public.nrs_tax_category DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS tax_scheme text DEFAULT 'VAT',
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0;

-- 7. nrs_submissions audit trail -------------------------------------------
CREATE TABLE IF NOT EXISTS public.nrs_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payload jsonb,
  validation_errors jsonb,
  result public.nrs_submission_status NOT NULL DEFAULT 'not_submitted',
  scenario text,
  mock boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nrs_submissions_invoice_idx ON public.nrs_submissions(invoice_id);
CREATE INDEX IF NOT EXISTS nrs_submissions_company_idx ON public.nrs_submissions(company_id);

ALTER TABLE public.nrs_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view nrs submissions" ON public.nrs_submissions;
CREATE POLICY "Members view nrs submissions"
  ON public.nrs_submissions FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Finance can append nrs submissions" ON public.nrs_submissions;
CREATE POLICY "Finance can append nrs submissions"
  ON public.nrs_submissions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_invoices(auth.uid(), company_id));
