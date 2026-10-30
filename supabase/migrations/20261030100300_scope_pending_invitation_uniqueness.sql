-- Additive index based on the invitation columns used by the Edge Function.
-- Compare with deployed indexes and check for duplicates before applying.
CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_company_email_idx
  ON public.company_invitations (company_id, lower(email))
  WHERE status = 'pending';
