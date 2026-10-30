CREATE TABLE IF NOT EXISTS public.company_creation_limits (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  creations_per_user_per_day integer NOT NULL DEFAULT 5 CHECK (creations_per_user_per_day > 0)
);

INSERT INTO public.company_creation_limits (id, creations_per_user_per_day)
VALUES (true, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_creation_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins manage company creation limits" ON public.company_creation_limits;
CREATE POLICY "Super admins manage company creation limits"
  ON public.company_creation_limits FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_creation_limits TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_company_owner
  ON public.user_roles (company_id)
  WHERE role = 'company_owner'::public.app_role;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::public.app_role
      AND company_id IS NULL
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.is_super_admin(_user_id)
      OR (
        EXISTS (
          SELECT 1
          FROM public.company_members
          WHERE user_id = _user_id
            AND company_id = _company_id
            AND status = 'Active'::public.member_status
        )
        AND (
          public.has_role(_user_id, 'company_owner'::public.app_role, _company_id)
          OR public.has_role(_user_id, 'company_admin'::public.app_role, _company_id)
        )
      )
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_invoices(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.is_super_admin(_user_id)
      OR (
        EXISTS (
          SELECT 1
          FROM public.company_members
          WHERE user_id = _user_id
            AND company_id = _company_id
            AND status = 'Active'::public.member_status
        )
        AND (
          public.has_role(_user_id, 'company_owner'::public.app_role, _company_id)
          OR public.has_role(_user_id, 'company_admin'::public.app_role, _company_id)
          OR public.has_role(_user_id, 'finance_officer'::public.app_role, _company_id)
        )
      )
$function$;

DROP POLICY IF EXISTS "Company admins can grant roles in their company" ON public.user_roles;
CREATE POLICY "Company admins can grant roles in their company"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (
      company_id IS NOT NULL
      AND role NOT IN (
        'super_admin'::public.app_role,
        'company_owner'::public.app_role
      )
      AND public.can_manage_company(auth.uid(), company_id)
    )
    OR (
      public.is_super_admin(auth.uid())
      AND role <> 'company_owner'::public.app_role
      AND (role <> 'super_admin'::public.app_role OR company_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Company admins can add members" ON public.company_members;
DROP POLICY IF EXISTS "Company admins can update members" ON public.company_members;
DROP POLICY IF EXISTS "Company admins can remove members" ON public.company_members;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_display_name text;
  v_invitation_id uuid;
  v_invitation_role public.app_role;
  v_pending_company_id uuid;
  v_auth_invite_nonce uuid;
  v_is_server_invitation boolean := false;
BEGIN
  v_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  SELECT ci.id, ci.company_id, ci.role, ci.auth_invite_nonce
    INTO v_invitation_id, v_pending_company_id, v_invitation_role, v_auth_invite_nonce
  FROM public.company_invitations ci
  WHERE lower(ci.email) = lower(NEW.email)
    AND ci.status = 'pending'
    AND ci.expires_at > now()
  ORDER BY ci.created_at
  LIMIT 1
  FOR UPDATE;

  v_is_server_invitation := v_invitation_id IS NOT NULL
    AND (
      NEW.invited_at IS NOT NULL
      OR (
        v_auth_invite_nonce IS NOT NULL
        AND NEW.raw_user_meta_data->>'tsflow_invitation_nonce' = v_auth_invite_nonce::text
      )
    );

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (id) DO NOTHING;

  IF v_is_server_invitation THEN
    INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
    VALUES (v_pending_company_id, NEW.id, 'Invited', NULL)
    ON CONFLICT (company_id, user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_pending_company_id, v_invitation_role)
    ON CONFLICT (user_id, company_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  p_name text,
  p_tin text DEFAULT 'NG-PENDING',
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email_confirmed_at timestamptz;
  v_daily_limit integer;
  v_company_count bigint;
  v_company_id uuid;
  v_name text := NULLIF(trim(p_name), '');
  v_tin text := COALESCE(NULLIF(trim(p_tin), ''), 'NG-PENDING');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT email_confirmed_at
    INTO v_email_confirmed_at
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Verify your email before creating a company';
  END IF;

  IF v_name IS NULL OR length(v_name) > 160 OR length(v_tin) > 100 THEN
    RAISE EXCEPTION 'Enter a valid company name and tax identification number';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT creations_per_user_per_day
    INTO v_daily_limit
  FROM public.company_creation_limits
  WHERE id = true
  FOR SHARE;

  IF v_daily_limit IS NULL THEN
    RAISE EXCEPTION 'Company creation limits are not configured';
  END IF;

  SELECT count(*)
    INTO v_company_count
  FROM public.companies
  WHERE created_by = v_user_id
    AND created_at >= now() - interval '24 hours';

  IF v_company_count >= v_daily_limit THEN
    RAISE EXCEPTION 'The company creation limit has been reached. Try again later';
  END IF;

  INSERT INTO public.companies (
    name, tin, industry, plan, status, created_by, city, state, country_code
  )
  VALUES (
    v_name, v_tin, 'Other', 'Starter', 'Trial', v_user_id,
    NULLIF(trim(p_city), ''), NULLIF(trim(p_state), ''), 'NG'
  )
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
  VALUES (v_company_id, v_user_id, 'Active', now());

  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (v_user_id, v_company_id, 'company_owner'::public.app_role);

  RETURN v_company_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_company_with_owner(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company_with_owner(text, text, text, text) TO authenticated;
