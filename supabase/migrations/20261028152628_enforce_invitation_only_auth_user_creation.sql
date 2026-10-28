-- Reconstructed repository source for the migration recorded in Supabase as
-- 20261028152628; the applied database definition was not queried in this task.
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
