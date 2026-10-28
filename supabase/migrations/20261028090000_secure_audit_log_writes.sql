-- Audit events are written only by trusted server-side code.
REVOKE INSERT ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.audit_logs TO service_role;

DROP POLICY IF EXISTS "Members can append audit logs" ON public.audit_logs;
