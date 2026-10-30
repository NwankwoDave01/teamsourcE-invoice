-- Additive protection based on the repository's reconstructed company_members,
-- user_roles, and companies definitions. Compare with deployed schema before applying.

CREATE OR REPLACE FUNCTION public.guard_company_owner_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  IF NEW.role <> 'company_owner'::public.app_role THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Company owner roles must be scoped to a company';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'company_owner'::public.app_role
     AND OLD.company_id = NEW.company_id
     AND OLD.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF v_actor_id IS NOT NULL AND (
    NEW.user_id <> v_actor_id
    OR NOT EXISTS (
      SELECT 1
      FROM public.companies c
      JOIN public.company_members cm
        ON cm.company_id = c.id
       AND cm.user_id = v_actor_id
       AND cm.status = 'Active'::public.member_status
      WHERE c.id = NEW.company_id
        AND c.created_by = v_actor_id
        AND c.created_at = transaction_timestamp()
    )
  ) THEN
    RAISE EXCEPTION 'Only the verified company creator may receive initial ownership';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_last_active_company_owner_role_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.role <> 'company_owner'::public.app_role
     OR (TG_OP = 'UPDATE'
         AND OLD.company_id = NEW.company_id
         AND OLD.user_id = NEW.user_id
         AND NEW.role = OLD.role) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM public.companies
  WHERE id = OLD.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.company_members cm
      ON cm.company_id = ur.company_id
     AND cm.user_id = ur.user_id
     AND cm.status = 'Active'::public.member_status
    WHERE ur.company_id = OLD.company_id
      AND ur.role = 'company_owner'::public.app_role
      AND ur.user_id <> OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Transfer company ownership before removing or downgrading the last active owner';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_last_active_company_owner_membership_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.status <> 'Active'::public.member_status
     OR NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.company_id = OLD.company_id
         AND ur.user_id = OLD.user_id
         AND ur.role = 'company_owner'::public.app_role
     )
     OR (TG_OP = 'UPDATE'
         AND OLD.company_id = NEW.company_id
         AND OLD.user_id = NEW.user_id
         AND NEW.status = OLD.status) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM public.companies
  WHERE id = OLD.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.company_members cm
      ON cm.company_id = ur.company_id
     AND cm.user_id = ur.user_id
     AND cm.status = 'Active'::public.member_status
    WHERE ur.company_id = OLD.company_id
      AND ur.role = 'company_owner'::public.app_role
      AND ur.user_id <> OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Transfer company ownership before disabling or removing the last active owner';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_company_owner_assignment ON public.user_roles;
CREATE TRIGGER guard_company_owner_assignment
  BEFORE INSERT OR UPDATE OF role, company_id, user_id ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_company_owner_assignment();

DROP TRIGGER IF EXISTS prevent_last_active_company_owner_role_removal ON public.user_roles;
CREATE TRIGGER prevent_last_active_company_owner_role_removal
  BEFORE DELETE OR UPDATE OF role, company_id, user_id ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_active_company_owner_role_removal();

DROP TRIGGER IF EXISTS prevent_last_active_company_owner_membership_removal ON public.company_members;
CREATE TRIGGER prevent_last_active_company_owner_membership_removal
  BEFORE DELETE OR UPDATE OF status, company_id, user_id ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_active_company_owner_membership_removal();

REVOKE ALL ON FUNCTION public.guard_company_owner_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_active_company_owner_role_removal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_active_company_owner_membership_removal() FROM PUBLIC, anon, authenticated;
