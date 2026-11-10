-- Self-service business registration and email-serialized invitation creation.
-- Keep this file in pending-migrations until the reviewed staging run is approved.
-- Supabase migration runners wrap each migration in a transaction; do not add
-- embedded BEGIN/COMMIT statements because they break the runner's atomicity.
--
-- This is based on the verified teamsource-einvoice-dev handle_new_user() body.
-- Its invitation nonce/profile/Invited-membership operations are preserved below.
-- The old company-provisioning ELSE branch in the live trigger was unreachable:
-- the trigger raised when no invitation existed. Self-service registration now
-- records a pending row in that branch and creates no workspace until confirmation.
--
-- Rollback guidance:
-- 1. Before rollback, capture the current public.handle_new_user() with
--    pg_get_functiondef and use that exact definition to restore the trigger.
--    The historical migration copy is not byte-for-byte the live trigger.
-- 2. Drop public.recover_business_registration(text,text,text),
--    public.tenant_admin_create_invitation(uuid,text,public.app_role,uuid,uuid),
--    and public.complete_business_registration().
-- 3. Drop public.pending_business_registrations (this deletes pending intent rows).
-- 4. Restore companies.tin NOT NULL only after every NULL TIN has been resolved.
--    Existing values, including any legacy placeholder values, are not rewritten.
--
-- TIN is optional at workspace creation. NRS submission performs its own strict
-- supplier TIN and taxpayer-profile validation; Trial/Active plan state is unrelated.

CREATE TABLE IF NOT EXISTS public.pending_business_registrations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 160),
  legal_name text CHECK (legal_name IS NULL OR char_length(legal_name) <= 200),
  admin_full_name text NOT NULL CHECK (char_length(admin_full_name) BETWEEN 2 AND 120),
  city text CHECK (city IS NULL OR char_length(city) <= 120),
  state text CHECK (state IS NULL OR char_length(state) <= 120),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz
);

REVOKE ALL ON TABLE public.pending_business_registrations FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public.pending_business_registrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pending_business_registrations_expiry_idx
  ON public.pending_business_registrations (expires_at) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS pending_business_registrations_normalized_email_key
  ON public.pending_business_registrations (lower(email));

-- Existing rows (including historical NG-PENDING values) remain untouched.
ALTER TABLE public.companies ALTER COLUMN tin DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
  v_invitation_id uuid;
  v_invitation_role public.app_role;
  v_pending_company_id uuid;
  v_auth_invite_nonce uuid;
  v_business_name text;
  v_legal_name text;
BEGIN
  -- Serialize invitation creation and Auth user creation on normalized email.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(lower(btrim(COALESCE(NEW.email, ''))), 0)
  );

  v_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  SELECT ci.id, ci.company_id, ci.role, ci.auth_invite_nonce
    INTO v_invitation_id, v_pending_company_id, v_invitation_role, v_auth_invite_nonce
  FROM public.company_invitations ci
  WHERE lower(btrim(ci.email)) = lower(btrim(NEW.email))
    AND ci.status = 'pending'
    AND ci.expires_at > now()
  ORDER BY ci.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_invitation_id IS NULL THEN
    IF NEW.raw_user_meta_data->>'tsflow_signup_intent' = 'business_registration' THEN
      v_business_name := NULLIF(trim(NEW.raw_user_meta_data->>'business_name'), '');
      v_legal_name := NULLIF(trim(NEW.raw_user_meta_data->>'legal_name'), '');
      IF v_business_name IS NULL OR char_length(v_business_name) NOT BETWEEN 2 AND 160
         OR char_length(v_display_name) NOT BETWEEN 2 AND 120
         OR (v_legal_name IS NOT NULL AND char_length(v_legal_name) > 200) THEN
        RAISE EXCEPTION 'Business registration details are invalid.';
      END IF;

      INSERT INTO public.pending_business_registrations
        (user_id, email, business_name, legal_name, admin_full_name)
      VALUES (NEW.id, lower(btrim(NEW.email)), v_business_name, v_legal_name, v_display_name);

      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Account creation requires a valid pending company invitation.'
      USING ERRCODE = '42501';
  END IF;

  -- Preserve live invitation nonce validation semantics. Auth-admin-created
  -- invite users need this one-time nonce only while invited_at is still NULL.
  IF NEW.invited_at IS NULL
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

  -- Existing live invitation behavior: users start Invited, get the role
  -- stored on the locked invitation, and only the acceptance RPC activates them.
  INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
  VALUES (v_pending_company_id, NEW.id, 'Invited', NULL)
  ON CONFLICT (company_id, user_id)
  DO UPDATE SET status = 'Invited', last_active_at = NULL;

  DELETE FROM public.user_roles
  WHERE user_id = NEW.id AND company_id = v_pending_company_id;

  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, v_pending_company_id, v_invitation_role);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_business_registration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_email text;
  v_reg public.pending_business_registrations%ROWTYPE;
  v_company_id uuid;
  v_existing_company_id uuid;
  v_active_membership_count bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT u.email_confirmed_at, lower(btrim(u.email))
    INTO v_confirmed, v_email
  FROM auth.users AS u WHERE u.id = v_uid;
  IF NOT FOUND OR v_email IS NULL THEN RAISE EXCEPTION 'A registered email is required'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));

  -- A valid invitation always wins. The invitation RPC also removes a still-
  -- pending self-service row while holding this same normalized-email lock.
  IF EXISTS (
    SELECT 1 FROM public.company_invitations AS ci
    WHERE lower(btrim(ci.email)) = v_email
      AND ci.status = 'pending'
      AND ci.expires_at > pg_catalog.now()
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', false, 'invitation_pending', true);
  END IF;

  SELECT * INTO v_reg
  FROM public.pending_business_registrations
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', false, 'invitation_pending', false);
  END IF;

  IF v_confirmed IS NULL OR v_email IS DISTINCT FROM v_reg.email THEN
    RAISE EXCEPTION 'Email confirmation is required before the workspace can be created';
  END IF;

  IF v_reg.status = 'completed' THEN
    IF v_reg.company_id IS NULL THEN RAISE EXCEPTION 'Completed workspace is unavailable'; END IF;
    RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', true, 'company_id', v_reg.company_id);
  END IF;

  -- Never create a second tenant if membership was established by another
  -- authorized flow after registration began. A single Active membership
  -- completes this intent against that existing workspace; Invited rows stay
  -- inactive and require the explicit invitation acceptance path.
  SELECT pg_catalog.count(*), pg_catalog.min(cm.company_id::text)::uuid
    INTO v_active_membership_count, v_existing_company_id
  FROM public.company_members AS cm
  WHERE cm.user_id = v_uid AND cm.status = 'Active';

  IF v_active_membership_count > 1 THEN
    RAISE EXCEPTION 'Multiple active workspaces require administrator resolution';
  ELSIF v_active_membership_count = 1 THEN
    UPDATE public.pending_business_registrations
    SET status = 'completed', company_id = v_existing_company_id,
        completed_at = COALESCE(completed_at, pg_catalog.now())
    WHERE user_id = v_uid;
    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'provisioned', true, 'company_id', v_existing_company_id, 'existing_membership', true
    );
  ELSIF EXISTS (
    SELECT 1 FROM public.company_members AS cm WHERE cm.user_id = v_uid
  ) THEN
    -- Do not let a stale or revoked Invited membership turn into self-service
    -- workspace creation. The administrator must resolve that membership.
    RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', false, 'invitation_pending', false);
  END IF;

  -- A confirmed identity may finish after the original intent expiry. Renewing
  -- here prevents a consumed confirmation link from stranding the user.
  IF v_reg.expires_at <= pg_catalog.now() THEN
    UPDATE public.pending_business_registrations
    SET expires_at = pg_catalog.now() + interval '7 days'
    WHERE user_id = v_uid;
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (v_uid, v_reg.admin_full_name)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  INSERT INTO public.companies (name, legal_name, tin, created_by, email, city, state)
  VALUES (v_reg.business_name, v_reg.legal_name, NULL, v_uid, v_reg.email, v_reg.city, v_reg.state)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
  VALUES (v_company_id, v_uid, 'Active', pg_catalog.now());

  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (v_uid, v_company_id, 'company_admin');

  UPDATE public.pending_business_registrations
  SET status = 'completed', company_id = v_company_id, completed_at = pg_catalog.now()
  WHERE user_id = v_uid;

  RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', true, 'company_id', v_company_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_business_registration() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.complete_business_registration() TO authenticated;

CREATE OR REPLACE FUNCTION public.recover_business_registration(
  p_business_name text,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_display_name text;
  v_business_name text := pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_business_name, ''), '\s+', ' ', 'g'));
  v_city text := NULLIF(pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_city, ''), '\s+', ' ', 'g')), '');
  v_state text := NULLIF(pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_state, ''), '\s+', ' ', 'g')), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF pg_catalog.char_length(v_business_name) NOT BETWEEN 2 AND 160
     OR (v_city IS NOT NULL AND pg_catalog.char_length(v_city) > 120)
     OR (v_state IS NOT NULL AND pg_catalog.char_length(v_state) > 120) THEN
    RAISE EXCEPTION 'Business registration details are invalid';
  END IF;

  SELECT lower(pg_catalog.btrim(u.email)), u.email_confirmed_at,
         COALESCE(NULLIF(pg_catalog.btrim(u.raw_user_meta_data->>'display_name'), ''), split_part(COALESCE(u.email, ''), '@', 1))
    INTO v_email, v_confirmed, v_display_name
  FROM auth.users AS u WHERE u.id = v_uid;
  IF NOT FOUND OR v_confirmed IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'A confirmed account is required for workspace recovery';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));

  IF EXISTS (
    SELECT 1 FROM public.company_invitations AS ci
    WHERE lower(pg_catalog.btrim(ci.email)) = v_email
      AND ci.status = 'pending' AND ci.expires_at > pg_catalog.now()
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'invitation_pending', true);
  END IF;

  -- Repeated recovery returns the workspace recorded by the first successful
  -- completion instead of treating its newly Active membership as a conflict.
  IF EXISTS (
    SELECT 1 FROM public.pending_business_registrations AS pbr
    WHERE pbr.user_id = v_uid AND pbr.status = 'completed'
  ) THEN
    RETURN public.complete_business_registration();
  END IF;

  IF EXISTS (SELECT 1 FROM public.company_members AS cm WHERE cm.user_id = v_uid) THEN
    RAISE EXCEPTION 'An existing workspace membership must be recovered by a company administrator';
  END IF;

  INSERT INTO public.pending_business_registrations
    (user_id, email, business_name, legal_name, admin_full_name, city, state, status, company_id, created_at, expires_at, completed_at)
  VALUES
    (v_uid, v_email, v_business_name, NULL, v_display_name, v_city, v_state, 'pending', NULL, pg_catalog.now(), pg_catalog.now() + interval '7 days', NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      business_name = EXCLUDED.business_name,
      legal_name = NULL,
      admin_full_name = EXCLUDED.admin_full_name,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      created_at = pg_catalog.now(),
      expires_at = pg_catalog.now() + interval '7 days'
  WHERE public.pending_business_registrations.status = 'pending';

  RETURN public.complete_business_registration();
END;
$function$;

REVOKE ALL ON FUNCTION public.recover_business_registration(text,text,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.recover_business_registration(text,text,text) TO authenticated;

-- Called only by the already-authorized tenant-admin Edge Function (service_role).
-- The advisory lock serializes the invitation row with handle_new_user(). It also
-- converts an existing unassigned Auth identity into an Invited member, never Active.
CREATE OR REPLACE FUNCTION public.tenant_admin_create_invitation(
  p_company_id uuid,
  p_email text,
  p_role public.app_role,
  p_invited_by uuid,
  p_auth_invite_nonce uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text := lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_user_id uuid;
  v_display_name text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF p_company_id IS NULL OR p_invited_by IS NULL OR p_auth_invite_nonce IS NULL
     OR p_role NOT IN ('company_admin', 'finance_officer', 'staff_user')
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
     OR pg_catalog.char_length(v_email) > 254 THEN
    RAISE EXCEPTION 'Invalid invitation details';
  END IF;

  IF NOT public.can_manage_company(p_invited_by, p_company_id) THEN
    RAISE EXCEPTION 'Active company administrator permission required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));

  UPDATE public.company_invitations
  SET status = 'revoked'
  WHERE lower(pg_catalog.btrim(email)) = v_email
    AND status = 'pending' AND expires_at <= pg_catalog.now();

  SELECT u.id INTO v_user_id
  FROM auth.users AS u
  WHERE lower(pg_catalog.btrim(u.email)) = v_email
  ORDER BY u.created_at
  LIMIT 1;

  -- Allow a fresh invitation after expiry or revocation by clearing only
  -- inactive memberships whose invitation for this email is no longer valid.
  -- Active memberships and still-pending invitations are never touched.
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles AS ur
    USING public.company_members AS cm
    WHERE cm.user_id = v_user_id
      AND cm.status = 'Invited'
      AND ur.user_id = cm.user_id AND ur.company_id = cm.company_id
      AND EXISTS (
        SELECT 1 FROM public.company_invitations AS old_invite
        WHERE old_invite.company_id = cm.company_id
          AND lower(pg_catalog.btrim(old_invite.email)) = v_email
          AND (old_invite.status = 'revoked' OR old_invite.expires_at <= pg_catalog.now())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.company_invitations AS live_invite
        WHERE live_invite.company_id = cm.company_id
          AND lower(pg_catalog.btrim(live_invite.email)) = v_email
          AND live_invite.status = 'pending'
          AND live_invite.expires_at > pg_catalog.now()
      );

    DELETE FROM public.company_members AS cm
    WHERE cm.user_id = v_user_id
      AND cm.status = 'Invited'
      AND EXISTS (
        SELECT 1 FROM public.company_invitations AS old_invite
        WHERE old_invite.company_id = cm.company_id
          AND lower(pg_catalog.btrim(old_invite.email)) = v_email
          AND (old_invite.status = 'revoked' OR old_invite.expires_at <= pg_catalog.now())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.company_invitations AS live_invite
        WHERE live_invite.company_id = cm.company_id
          AND lower(pg_catalog.btrim(live_invite.email)) = v_email
          AND live_invite.status = 'pending'
          AND live_invite.expires_at > pg_catalog.now()
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.company_invitations
    WHERE lower(pg_catalog.btrim(email)) = v_email
      AND status = 'pending' AND expires_at > pg_catalog.now()
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;

  SELECT u.id,
         COALESCE(NULLIF(pg_catalog.btrim(u.raw_user_meta_data->>'display_name'), ''), split_part(COALESCE(u.email, ''), '@', 1))
    INTO v_user_id, v_display_name
  FROM auth.users AS u
  WHERE lower(pg_catalog.btrim(u.email)) = v_email
  ORDER BY u.created_at
  LIMIT 1;

  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.company_members AS cm
    WHERE cm.user_id = v_user_id AND cm.status = 'Active'
  ) THEN
    RAISE EXCEPTION 'This account already has an active workspace membership';
  END IF;

  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.company_members AS cm
    WHERE cm.user_id = v_user_id AND cm.status = 'Invited'
  ) THEN
    RAISE EXCEPTION 'This account already has an incomplete invitation';
  END IF;

  INSERT INTO public.company_invitations
    (company_id, email, role, invited_by, status, auth_invite_nonce)
  VALUES
    (p_company_id, v_email, p_role, p_invited_by, 'pending', CASE WHEN v_user_id IS NULL THEN p_auth_invite_nonce ELSE NULL END)
  RETURNING id, expires_at INTO v_invitation_id, v_expires_at;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, display_name)
    VALUES (v_user_id, v_display_name)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

    INSERT INTO public.company_members (company_id, user_id, status, last_active_at)
    VALUES (p_company_id, v_user_id, 'Invited', NULL)
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET status = 'Invited', last_active_at = NULL;

    DELETE FROM public.user_roles WHERE company_id = p_company_id AND user_id = v_user_id;
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (v_user_id, p_company_id, p_role);

    DELETE FROM public.pending_business_registrations
    WHERE user_id = v_user_id AND status = 'pending';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'invitation_id', v_invitation_id,
    'expires_at', v_expires_at,
    'auth_user_id', v_user_id,
    'auth_invite_nonce', CASE WHEN v_user_id IS NULL THEN p_auth_invite_nonce ELSE NULL END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.tenant_admin_create_invitation(uuid,text,public.app_role,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_admin_create_invitation(uuid,text,public.app_role,uuid,uuid)
  TO service_role;
