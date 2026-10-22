ALTER TABLE public.company_invitations
  ADD COLUMN IF NOT EXISTS auth_invite_nonce uuid;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_tin text;
  v_display_name text;
  v_invitation_id uuid;
  v_invitation_role public.app_role;
  v_pending_company_id uuid;
  v_auth_invite_nonce uuid;
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

  -- A self-signup must not consume an outstanding invitation. Supabase's admin
  -- invite endpoint also inserts auth.users while invited_at can still be NULL,
  -- so identify that specific server-initiated insert with a one-time nonce that
  -- only the authenticated tenant-admin Edge Function generates.
  IF v_invitation_id IS NOT NULL
     AND NEW.invited_at IS NULL
     AND (
       v_auth_invite_nonce IS NULL
       OR NEW.raw_user_meta_data->>'tsflow_invitation_nonce' IS DISTINCT FROM v_auth_invite_nonce::text
     )
  THEN
    RAISE EXCEPTION 'This email has a pending company invitation. Open the invitation email to finish account setup.';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  IF v_invitation_id IS NOT NULL THEN
    -- Invited accounts never receive tenant access from this trigger.
    -- The atomic acceptance RPC alone changes Invited -> Active.
    INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
    VALUES (v_pending_company_id, NEW.id, 'Invited', NULL)
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET status = 'Invited', last_active_at = NULL;

    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND company_id = v_pending_company_id;

    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_pending_company_id, v_invitation_role);
  ELSE
    v_company_name := COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), ''),
      v_display_name || '''s Company'
    );
    v_tin := COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'tin'), ''),
      'NG-PENDING'
    );

    INSERT INTO public.companies (
      name, legal_name, tin, industry, plan, status, created_by,
      email, phone, rc_number, vat_number,
      address_line1, address_line2, city, state, lga, postcode,
      country_code, business_description
    )
    VALUES (
      v_company_name,
      COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'legal_name'), ''), v_company_name),
      v_tin,
      COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'industry'), ''), 'Other'),
      'Starter', 'Trial', NEW.id,
      NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'company_email', NEW.email))), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'company_phone'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'rc_number'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'vat_number'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'address_line1'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'address_line2'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'city'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'state'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'lga'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'postcode'), ''),
      COALESCE(NULLIF(upper(trim(NEW.raw_user_meta_data->>'country_code')), ''), 'NG'),
      NULLIF(trim(NEW.raw_user_meta_data->>'business_description'), '')
    )
    RETURNING id INTO v_company_id;

    INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
    VALUES (v_company_id, NEW.id, 'Active', now());

    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_company_id, 'company_admin');
  END IF;

  RETURN NEW;
END;
$function$;;
