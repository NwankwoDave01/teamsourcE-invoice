CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_company_email_uidx
ON public.company_invitations (company_id, lower(email))
WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.tenant_admin_accept_invitation(
  p_user_id uuid,
  p_email text,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_invitation public.company_invitations%ROWTYPE;
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_updated_count integer;
BEGIN
  SELECT lower(u.email), u.email_confirmed_at
  INTO v_user_email, v_email_confirmed_at
  FROM auth.users AS u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_user_email IS DISTINCT FROM lower(trim(p_email))
     OR v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'A verified account matching the invitation email is required';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.company_invitations
  WHERE company_id = p_company_id
    AND lower(email) = v_user_email
    AND status = 'pending'
    AND expires_at > pg_catalog.now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid pending invitation exists for this company and email';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_members AS cm
    JOIN public.user_roles AS ur
      ON ur.user_id = cm.user_id
     AND ur.company_id = cm.company_id
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
      AND cm.status = 'Invited'
      AND ur.role = v_invitation.role
  ) THEN
    RAISE EXCEPTION 'Matching invited membership and role were not found';
  END IF;

  UPDATE public.company_members
  SET status = 'Active', last_active_at = pg_catalog.now()
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND status = 'Invited';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION 'Membership activation failed';
  END IF;

  UPDATE public.company_invitations
  SET status = 'accepted',
      accepted_at = pg_catalog.now(),
      accepted_user_id = p_user_id
  WHERE id = v_invitation.id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation acceptance failed';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'accepted', true,
    'company_id', p_company_id,
    'role', v_invitation.role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.tenant_admin_accept_invitation(uuid, text, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.tenant_admin_accept_invitation(uuid, text, uuid)
TO service_role;

CREATE OR REPLACE FUNCTION public.nrs_si_configuration_ready(
  _company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    (
      auth.role() = 'service_role'
      OR (
        auth.uid() IS NOT NULL
        AND (
          public.is_super_admin(auth.uid())
          OR public.is_company_member(auth.uid(), _company_id)
        )
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      JOIN public.nrs_taxpayer_credentials tc
        ON tc.company_id = c.id
       AND tc.environment = CASE
         WHEN lower(coalesce(c.nrs_environment, 'sandbox')) = 'production'
         THEN 'production'
         ELSE 'sandbox'
       END
       AND tc.api_key_secret_id IS NOT NULL
       AND tc.api_secret_secret_id IS NOT NULL
      JOIN public.nrs_taxpayer_crypto cx
        ON cx.company_id = c.id
       AND cx.environment = CASE
         WHEN lower(coalesce(c.nrs_environment, 'sandbox')) = 'production'
         THEN 'production'
         ELSE 'sandbox'
       END
       AND cx.active = true
      WHERE c.id = _company_id
        AND NULLIF(btrim(c.nrs_business_id), '') IS NOT NULL
        AND NULLIF(btrim(c.nrs_service_id), '') IS NOT NULL
        AND NULLIF(
          btrim(
            CASE
              WHEN lower(coalesce(c.nrs_environment, 'sandbox')) = 'production'
              THEN c.nrs_production_base_url
              ELSE c.nrs_sandbox_base_url
            END
          ),
          ''
        ) IS NOT NULL
    );
$function$;

REVOKE ALL ON FUNCTION public.nrs_si_configuration_ready(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.nrs_si_configuration_ready(uuid)
TO authenticated, service_role;
