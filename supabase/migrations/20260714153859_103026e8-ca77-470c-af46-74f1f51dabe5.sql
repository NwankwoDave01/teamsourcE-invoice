
-- 1. Extend products with NRS fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_code text NOT NULL DEFAULT 'EA',
  ADD COLUMN IF NOT EXISTS tax_category text NOT NULL DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS item_classification_code text,
  ADD COLUMN IF NOT EXISTS hsn_code text,
  ADD COLUMN IF NOT EXISTS product_category text;

-- 2. Extend invoice_lines with NRS fields
ALTER TABLE public.invoice_lines
  ADD COLUMN IF NOT EXISTS unit_code text NOT NULL DEFAULT 'EA',
  ADD COLUMN IF NOT EXISTS tax_category text NOT NULL DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS tax_scheme text NOT NULL DEFAULT 'VAT',
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric,
  ADD COLUMN IF NOT EXISTS tax_amount numeric,
  ADD COLUMN IF NOT EXISTS item_classification_code text,
  ADD COLUMN IF NOT EXISTS hsn_code text,
  ADD COLUMN IF NOT EXISTS product_category text;

-- 3. Extend invoices with NRS fields
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT '380',
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'B2B',
  ADD COLUMN IF NOT EXISTS supply_date date,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS payment_means_code text NOT NULL DEFAULT '30',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;

-- 4. NRS master data (public reference library)
CREATE TABLE IF NOT EXISTS public.nrs_master_data (
  resource_type text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resource_type, code)
);
GRANT SELECT ON public.nrs_master_data TO anon, authenticated;
GRANT ALL ON public.nrs_master_data TO service_role;
ALTER TABLE public.nrs_master_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "NRS master data is readable by everyone" ON public.nrs_master_data;
CREATE POLICY "NRS master data is readable by everyone"
  ON public.nrs_master_data FOR SELECT
  USING (true);

-- 5. NRS submissions log
CREATE TABLE IF NOT EXISTS public.nrs_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payload jsonb,
  validation_errors jsonb,
  result text,
  scenario text,
  mock boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nrs_submissions TO authenticated;
GRANT ALL ON public.nrs_submissions TO service_role;
ALTER TABLE public.nrs_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their company's submissions" ON public.nrs_submissions;
CREATE POLICY "Members can view their company's submissions"
  ON public.nrs_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = nrs_submissions.invoice_id
        AND public.is_company_member(auth.uid(), i.company_id)
    )
  );

-- 6. Auth trigger to create workspace on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Seed baseline NRS reference codes
INSERT INTO public.nrs_master_data (resource_type, code, label, metadata) VALUES
  ('tax-categories','S','Standard Rated VAT (7.5%)', '{"tax_rate":7.5}'::jsonb),
  ('tax-categories','Z','Zero Rated VAT (0%)', '{"tax_rate":0}'::jsonb),
  ('tax-categories','E','VAT Exempt', '{"tax_rate":0}'::jsonb),
  ('tax-categories','O','Out of Scope', '{"tax_rate":0}'::jsonb),
  ('currencies','NGN','NGN — Nigerian Naira', NULL),
  ('currencies','USD','USD — US Dollar', NULL),
  ('currencies','GBP','GBP — British Pound', NULL),
  ('currencies','EUR','EUR — Euro', NULL),
  ('invoice-types','380','Commercial Invoice', NULL),
  ('invoice-types','381','Credit Note', NULL),
  ('invoice-types','383','Debit Note', NULL),
  ('payment-means','10','Cash', NULL),
  ('payment-means','30','Bank Transfer', NULL),
  ('payment-means','42','Cheque', NULL),
  ('payment-means','48','Credit Card', NULL),
  ('payment-means','97','Other', NULL),
  ('unit-codes','EA','Each', NULL),
  ('unit-codes','KGM','Kilogram', NULL),
  ('unit-codes','LTR','Litre', NULL),
  ('unit-codes','MTR','Metre', NULL),
  ('unit-codes','HUR','Hour', NULL),
  ('unit-codes','DAY','Day', NULL),
  ('unit-codes','BG','Bag', NULL),
  ('unit-codes','CT','Carton', NULL),
  ('unit-codes','PCE','Piece', NULL),
  ('hs-codes','1006.30','Rice, semi-milled or wholly milled', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','1507.90','Refined soybean/palm oil', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','1701.99','Refined cane or beet sugar', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','1101.00','Wheat or meslin flour', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','2106.90','Food preparations, n.e.s.', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','2523.29','Portland cement', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','8517.12','Telephones for cellular networks', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','8471.30','Portable data-processing machines', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('hs-codes','3004.90','Medicaments, packaged for retail', '{"tax_category":"E","tax_rate":0}'::jsonb),
  ('hs-codes','4901.99','Printed books, brochures', '{"tax_category":"Z","tax_rate":0}'::jsonb),
  ('services-codes','9983.11','Management consulting services', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('services-codes','9983.13','Information technology consulting services', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('services-codes','9971.10','Financial services', '{"tax_category":"E","tax_rate":0}'::jsonb),
  ('services-codes','9964.11','Logistics & delivery services', '{"tax_category":"S","tax_rate":7.5}'::jsonb),
  ('services-codes','9983.19','Other professional services', '{"tax_category":"S","tax_rate":7.5}'::jsonb)
ON CONFLICT (resource_type, code) DO NOTHING;
