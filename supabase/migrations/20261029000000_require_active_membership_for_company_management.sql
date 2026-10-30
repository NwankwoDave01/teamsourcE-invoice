CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
      AND company_id IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR (
        EXISTS (
          SELECT 1
          FROM public.company_members
          WHERE user_id = _user_id
            AND company_id = _company_id
            AND status = 'Active'
        )
        AND public.has_role(_user_id, 'company_admin', _company_id)
      )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_invoices(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR (
        EXISTS (
          SELECT 1
          FROM public.company_members
          WHERE user_id = _user_id
            AND company_id = _company_id
            AND status = 'Active'
        )
        AND (
          public.has_role(_user_id, 'company_admin', _company_id)
          OR public.has_role(_user_id, 'finance_officer', _company_id)
        )
      )
$$;

DROP POLICY IF EXISTS "Company admins can grant roles in their company" ON public.user_roles;
CREATE POLICY "Company admins can grant roles in their company"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (
      company_id IS NOT NULL
      AND role <> 'super_admin'::public.app_role
      AND public.can_manage_company(auth.uid(), company_id)
    )
    OR (
      public.is_super_admin(auth.uid())
      AND (role <> 'super_admin'::public.app_role OR company_id IS NULL)
    )
  );

REVOKE TRUNCATE ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
