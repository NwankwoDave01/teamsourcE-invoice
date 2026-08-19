-- =============================================================================
-- NRS taxpayer credential architecture (multi-tenant, Vault-backed)
-- Additive only. Nothing is dropped. Legacy plaintext companies.nrs_* columns
-- are intentionally left in place for backward compatibility (Phase 2 cleanup).
-- =============================================================================

-- 1. Non-secret company columns used by the NRS tab -----------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS nrs_entity_id TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS nrs_taxpayer_email TEXT;

-- one-time backfill from the legacy portal email
UPDATE public.companies
   SET nrs_taxpayer_email = nrs_portal_email
 WHERE nrs_taxpayer_email IS NULL
   AND nrs_portal_email IS NOT NULL;

-- 2. Credential reference table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nrs_credentials (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key_secret_id UUID,
  api_secret_secret_id UUID,
  taxpayer_password_secret_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- verification state (drives the connection badge)
ALTER TABLE public.nrs_credentials ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.nrs_credentials ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.nrs_credentials ADD COLUMN IF NOT EXISTS last_verification_error TEXT;

-- 3. Grants: server-side only. No client role may read secret references. -------
GRANT ALL ON public.nrs_credentials TO service_role;
REVOKE ALL ON public.nrs_credentials FROM anon, authenticated;

ALTER TABLE public.nrs_credentials ENABLE ROW LEVEL SECURITY;
-- deliberately no policies for anon/authenticated: access is service_role only
-- (the nrs-credentials Edge Function), which bypasses RLS.

DROP TRIGGER IF EXISTS trg_nrs_credentials_updated ON public.nrs_credentials;
CREATE TRIGGER trg_nrs_credentials_updated
  BEFORE UPDATE ON public.nrs_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Vault helpers (parameterized, security definer, service_role only) ---------
CREATE OR REPLACE FUNCTION public.nrs_store_secret(
  _company_id UUID,
  _kind TEXT,
  _value TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_col TEXT;
  v_existing UUID;
  v_new UUID;
  v_name TEXT;
BEGIN
  IF _kind NOT IN ('api_key', 'api_secret', 'taxpayer_password') THEN
    RAISE EXCEPTION 'invalid secret kind';
  END IF;
  v_col := _kind || '_secret_id';
  v_name := 'nrs_' || _kind || '_' || _company_id::text;

  INSERT INTO public.nrs_credentials (company_id) VALUES (_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  EXECUTE format('SELECT %I FROM public.nrs_credentials WHERE company_id = $1', v_col)
    INTO v_existing USING _company_id;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _value);
  ELSE
    v_new := vault.create_secret(_value, v_name, 'NRS credential');
    EXECUTE format(
      'UPDATE public.nrs_credentials SET %I = $1, verified = false, verified_at = NULL, last_verification_error = NULL WHERE company_id = $2',
      v_col
    ) USING v_new, _company_id;
  END IF;

  UPDATE public.nrs_credentials
     SET verified = false, verified_at = NULL, last_verification_error = NULL
   WHERE company_id = _company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nrs_read_secrets(_company_id UUID)
RETURNS TABLE (api_key TEXT, api_secret TEXT, taxpayer_password TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT
    (SELECT s.decrypted_secret FROM vault.decrypted_secrets s WHERE s.id = c.api_key_secret_id),
    (SELECT s.decrypted_secret FROM vault.decrypted_secrets s WHERE s.id = c.api_secret_secret_id),
    (SELECT s.decrypted_secret FROM vault.decrypted_secrets s WHERE s.id = c.taxpayer_password_secret_id)
  FROM public.nrs_credentials c
  WHERE c.company_id = _company_id;
$$;

CREATE OR REPLACE FUNCTION public.nrs_delete_secrets(_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.nrs_credentials WHERE company_id = _company_id;
  IF NOT FOUND THEN RETURN; END IF;
  DELETE FROM vault.secrets WHERE id IN (
    r.api_key_secret_id, r.api_secret_secret_id, r.taxpayer_password_secret_id
  );
  DELETE FROM public.nrs_credentials WHERE company_id = _company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nrs_set_verification(
  _company_id UUID,
  _verified BOOLEAN,
  _error TEXT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.nrs_credentials (company_id, verified, verified_at, last_verification_error)
  VALUES (_company_id, _verified, CASE WHEN _verified THEN now() ELSE NULL END, _error)
  ON CONFLICT (company_id) DO UPDATE
    SET verified = EXCLUDED.verified,
        verified_at = EXCLUDED.verified_at,
        last_verification_error = EXCLUDED.last_verification_error;
$$;

-- Only the Edge Function (service_role) may call these.
REVOKE ALL ON FUNCTION public.nrs_store_secret(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nrs_read_secrets(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nrs_delete_secrets(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nrs_set_verification(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nrs_store_secret(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.nrs_read_secrets(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.nrs_delete_secrets(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.nrs_set_verification(UUID, BOOLEAN, TEXT) TO service_role;
