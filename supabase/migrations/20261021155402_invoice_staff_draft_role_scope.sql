
-- Reconcile source with the correction already applied to Supabase as version 20261021155402.
-- Staff Users may create and edit Draft invoices only within their active company.
-- Ensure callers cannot pass another user's ID to probe or obtain edit permissions.

CREATE OR REPLACE FUNCTION public.can_edit_invoice(
  _user_id UUID,
  _company_id UUID,
  _status public.invoice_status
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      _user_id = auth.uid()
      OR (
        auth.uid() IS NULL
        AND (auth.jwt() ->> 'role') IS NOT DISTINCT FROM 'service_role'
      )
    )
    AND (
      public.can_manage_invoices(_user_id, _company_id)
      OR (
        public.is_company_member(_user_id, _company_id)
        AND public.has_role(_user_id, 'staff_user', _company_id)
        AND _status = 'Draft'::public.invoice_status
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_edit_invoice(UUID, UUID, public.invoice_status)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_edit_invoice(UUID, UUID, public.invoice_status)
  FROM anon, PUBLIC;

DROP POLICY IF EXISTS "Authorized users can insert invoices"
  ON public.invoices;

CREATE POLICY "Authorized users can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_invoices(auth.uid(), company_id)
    OR (
      public.is_company_member(auth.uid(), company_id)
      AND public.has_role(auth.uid(), 'staff_user', company_id)
      AND status = 'Draft'::public.invoice_status
    )
  );
