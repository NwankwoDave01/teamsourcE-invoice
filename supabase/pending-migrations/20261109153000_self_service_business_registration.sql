-- NOT READY: source review draft only; NEVER applied by Lovable.
-- Blocking review items for the external production database:
-- 1. Compare invitation branch byte-for-byte with pg_get_functiondef(handle_new_user).
--    The repository invitation-only function is reconstructed, not a live snapshot.
-- 2. Verify all referenced columns, defaults, indexes, FKs, grants and enum labels
--    against the live catalog; repository evidence + supplied schema are not a full catalog.
-- 3. Agree the missing taxpayer TIN policy. companies.tin is NOT NULL and the
--    registration form does not collect TIN. No placeholder is permitted.
--    Provisioning deliberately raises before writes until this policy is resolved.
-- 4. Test trigger + RPC transactions/concurrency on an isolated staging database.
-- Move to supabase/migrations/ (or apply via your migration workflow) after review.
--
-- Design:
--   * handle_new_user() keeps the invitation branch unchanged: any pending,
--     unexpired invitation for the email ALWAYS takes the invitation path
--     (nonce check, profile, 'Invited' membership, invited role). Self-service
--     metadata can therefore never bypass or spoof an invitation.
--   * Only when NO pending invitation exists AND the signup carries
--     tsflow_signup_intent = 'business_registration' does the trigger record a
--     pending_business_registrations row. It grants NOTHING: no company, no
--     membership, no role. Every other signup is still rejected (invitation-only).
--   * complete_business_registration() (SECURITY DEFINER, no arguments, uses
--     auth.uid()) provisions company + Active membership + company_admin ONLY when
--     auth.users.email_confirmed_at IS NOT NULL and an unexpired pending row exists.
--     Row lock + status make it idempotent and race-safe. Company id and role are
--     never client-supplied.
--
-- Rollback (manual):
--   1. Re-run supabase/migrations/20261028152628_enforce_invitation_only_auth_user_creation.sql
--      to restore the invitation-only handle_new_user().
--   2. DROP FUNCTION IF EXISTS public.complete_business_registration();
--      DROP FUNCTION IF EXISTS public.purge_expired_business_registrations();
--   3. (Optional, destroys pending registration data)
--      DROP TABLE IF EXISTS public.pending_business_registrations;
--   Companies already provisioned remain as normal tenants.

CREATE TABLE IF NOT EXISTS public.pending_business_registrations (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 160),
  legal_name text CHECK (legal_name IS NULL OR char_length(legal_name) <= 200),
  admin_full_name text NOT NULL CHECK (char_length(admin_full_name) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz
);

-- Server/database only: no browser role may read or write this table.
REVOKE ALL ON public.pending_business_registrations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pending_business_registrations TO service_role;
ALTER TABLE public.pending_business_registrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pending_business_registrations_expiry_idx
  ON public.pending_business_registrations (expires_at) WHERE status = 'pending';

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

  IF v_invitation_id IS NULL THEN
    -- Self-service registration: record intent only; grants no access.
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
      VALUES (NEW.id, lower(NEW.email), v_business_name, v_legal_name, v_display_name);

      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Workspace access is invitation-only. Ask a company administrator for an invitation.';
  END IF;

  -- Keep the one-time nonce check for server-created invites whose Auth row has no invited_at value yet.
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

  -- A valid invitation starts inactive; only the acceptance RPC activates membership.
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT u.email_confirmed_at, lower(u.email)
    INTO v_confirmed, v_email
  FROM auth.users u WHERE u.id = v_uid;

  SELECT * INTO v_reg
  FROM public.pending_business_registrations
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', false);
  END IF;

  IF v_confirmed IS NULL OR v_email IS DISTINCT FROM v_reg.email THEN
    RAISE EXCEPTION 'Email confirmation is required before the workspace can be created';
  END IF;

  IF v_reg.status = 'completed' THEN
    IF v_reg.company_id IS NULL THEN
      RAISE EXCEPTION 'Completed workspace is unavailable';
    END IF;
    RETURN pg_catalog.jsonb_build_object('ok', true, 'provisioned', true, 'company_id', v_reg.company_id);
  END IF;

  IF v_reg.expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'This registration has expired. Please register again.';
  END IF;

  -- NOT READY: companies.tin is required with no evidenced default. There is
  -- no approved source for a new business TIN. Fail before ALL provisioning
  -- writes instead of inserting a fabricated taxpayer identity.
  RAISE EXCEPTION 'Business registration provisioning is not enabled: TIN policy requires review';

  INSERT INTO public.profiles (id, display_name)
  VALUES (v_uid, v_reg.admin_full_name)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- NOT READY: resolve TIN policy before this draft can be applied.
  -- Use existing plan/status defaults rather than overriding them.
  INSERT INTO public.companies (name, legal_name, created_by, email)
  VALUES (v_reg.business_name, v_reg.legal_name, v_uid, v_reg.email)
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

REVOKE ALL ON FUNCTION public.complete_business_registration() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_business_registration() TO authenticated, service_role;

-- Spam hygiene: removes expired unconfirmed registration intents (service_role only).
-- Deleting the matching unconfirmed auth.users rows must be done via the Auth admin API.
CREATE OR REPLACE FUNCTION public.purge_expired_business_registrations()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH d AS (
    DELETE FROM public.pending_business_registrations
    WHERE status = 'pending' AND expires_at <= pg_catalog.now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM d;
$function$;

REVOKE ALL ON FUNCTION public.purge_expired_business_registrations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_business_registrations() TO service_role;
