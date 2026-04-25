
-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company_admin', 'finance_officer', 'staff_user');
CREATE TYPE public.company_plan AS ENUM ('Starter', 'Growth', 'Enterprise');
CREATE TYPE public.company_status AS ENUM ('Active', 'Trial', 'Suspended');
CREATE TYPE public.member_status AS ENUM ('Active', 'Invited', 'Disabled');
CREATE TYPE public.invoice_status AS ENUM (
  'Draft', 'In Review', 'Approved', 'Ready',
  'Submitted', 'Validated', 'Signed', 'Confirmed', 'Rejected'
);
CREATE TYPE public.audit_category AS ENUM ('Invoice', 'Customer', 'Product', 'User', 'Settings', 'Auth');

-- ============================================================================
-- CORE TENANCY TABLES
-- ============================================================================

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tin TEXT NOT NULL,
  industry TEXT,
  plan public.company_plan NOT NULL DEFAULT 'Starter',
  status public.company_status NOT NULL DEFAULT 'Trial',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.member_status NOT NULL DEFAULT 'Active',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

-- Roles in a SEPARATE table (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL for super_admin
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, role)
);

-- ============================================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_company_id IS NULL OR company_id = _company_id OR (role = 'super_admin' AND company_id IS NULL))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND status = 'Active'
  ) OR public.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'company_admin', _company_id)
      OR public.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_invoices(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'company_admin', _company_id)
      OR public.has_role(_user_id, 'finance_officer', _company_id)
      OR public.is_super_admin(_user_id)
$$;

-- ============================================================================
-- BUSINESS DATA TABLES
-- ============================================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tin TEXT,
  city TEXT,
  status public.member_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers(company_id);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 7.5,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);
CREATE INDEX idx_products_company ON public.products(company_id);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'Draft',
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  irn TEXT,
  notes TEXT,
  po_reference TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, number)
);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoices_status ON public.invoices(company_id, status);

CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty NUMERIC(14, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 7.5,
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  category public.audit_category NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company_created ON public.audit_logs(company_id, created_at DESC);

-- ============================================================================
-- GLOBAL (PLATFORM) TABLES
-- ============================================================================

CREATE TABLE public.integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Operational',
  uptime TEXT,
  latency TEXT,
  last_incident TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'INFO',
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_logs_created ON public.system_logs(created_at DESC);

-- ============================================================================
-- updated_at TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- AUTO-PROVISIONING ON SIGNUP
-- ============================================================================
-- Creates profile + company + membership + company_admin role from signup metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_company_name TEXT;
  v_tin TEXT;
  v_display_name TEXT;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_company_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), v_display_name || '''s Company');
  v_tin := COALESCE(NULLIF(NEW.raw_user_meta_data->>'tin', ''), 'NG-PENDING');

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name);

  INSERT INTO public.companies (name, tin, industry, plan, status, created_by)
  VALUES (v_company_name, v_tin, COALESCE(NEW.raw_user_meta_data->>'industry', 'Other'), 'Starter', 'Trial', NEW.id)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
  VALUES (v_company_id, NEW.id, 'Active', now());

  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, v_company_id, 'company_admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ----- profiles -----
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ----- companies -----
CREATE POLICY "Members can view their company"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), id));

CREATE POLICY "Company admins can update their company"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.can_manage_company(auth.uid(), id));

CREATE POLICY "Super admins can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ----- company_members -----
CREATE POLICY "Members can view their company team"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can add members"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(auth.uid(), company_id));

CREATE POLICY "Company admins can update members"
  ON public.company_members FOR UPDATE TO authenticated
  USING (public.can_manage_company(auth.uid(), company_id));

CREATE POLICY "Company admins can remove members"
  ON public.company_members FOR DELETE TO authenticated
  USING (public.can_manage_company(auth.uid(), company_id));

-- ----- user_roles -----
CREATE POLICY "Users can view roles in their company"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (company_id IS NOT NULL AND public.is_company_member(auth.uid(), company_id))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Company admins can grant roles in their company"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.can_manage_company(auth.uid(), company_id))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Company admins can revoke roles in their company"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    (company_id IS NOT NULL AND public.can_manage_company(auth.uid(), company_id))
    OR public.is_super_admin(auth.uid())
  );

-- ----- customers -----
CREATE POLICY "Members view customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Finance can manage customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_invoices(auth.uid(), company_id));

CREATE POLICY "Finance can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.can_manage_invoices(auth.uid(), company_id));

CREATE POLICY "Finance can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.can_manage_invoices(auth.uid(), company_id));

-- ----- products -----
CREATE POLICY "Members view products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Finance can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_invoices(auth.uid(), company_id));

CREATE POLICY "Finance can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.can_manage_invoices(auth.uid(), company_id));

CREATE POLICY "Finance can delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.can_manage_invoices(auth.uid(), company_id));

-- ----- invoices -----
CREATE POLICY "Members view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Finance can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_invoices(auth.uid(), company_id));

CREATE POLICY "Finance can update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (public.can_manage_invoices(auth.uid(), company_id));

CREATE POLICY "Finance can delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (public.can_manage_invoices(auth.uid(), company_id));

-- ----- invoice_lines (nested check via parent invoice) -----
CREATE POLICY "Members view invoice lines"
  ON public.invoice_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND public.is_company_member(auth.uid(), i.company_id)
  ));

CREATE POLICY "Finance can insert invoice lines"
  ON public.invoice_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND public.can_manage_invoices(auth.uid(), i.company_id)
  ));

CREATE POLICY "Finance can update invoice lines"
  ON public.invoice_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND public.can_manage_invoices(auth.uid(), i.company_id)
  ));

CREATE POLICY "Finance can delete invoice lines"
  ON public.invoice_lines FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND public.can_manage_invoices(auth.uid(), i.company_id)
  ));

-- ----- audit_logs -----
CREATE POLICY "Members view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can append audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- ----- integration_health (read for all signed-in, write for super_admin) -----
CREATE POLICY "Authenticated can view integration health"
  ON public.integration_health FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage integration health"
  ON public.integration_health FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----- system_logs (super_admin only) -----
CREATE POLICY "Super admins view system logs"
  ON public.system_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins write system logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
