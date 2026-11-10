import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const draft = readFileSync("supabase/migrations/20261110104552_self_service_business_registration.sql", "utf8");
const previous = readFileSync("supabase/migrations/20261028152628_enforce_invitation_only_auth_user_creation.sql", "utf8");
const trigger = draft.split("CREATE OR REPLACE FUNCTION public.handle_new_user()")[1]?.split("$function$;")[0] ?? "";
const rpc = draft.split("CREATE OR REPLACE FUNCTION public.complete_business_registration()")[1]?.split("$function$;")[0] ?? "";
const recovery = draft.split("CREATE OR REPLACE FUNCTION public.recover_business_registration(")[1]?.split("$function$;")[0] ?? "";
const invite = draft.split("CREATE OR REPLACE FUNCTION public.tenant_admin_create_invitation(")[1]?.split("$function$;")[0] ?? "";

// Source guards only. These do NOT establish live schema readiness or DB runtime behavior.
describe("staged registration SQL safety guards", () => {
  it("keeps the existing invitation nonce and inactive membership behavior", () => {
    const start = "  -- Preserve live invitation nonce validation semantics.";
    const end = "  RETURN NEW;";
    const branch = trigger.slice(trigger.indexOf(start), trigger.lastIndexOf(end));
    const oldBranchStart = "  -- Keep the one-time nonce check";
    const oldBranch = previous.slice(previous.indexOf(oldBranchStart), previous.lastIndexOf(end));
    for (const invariant of [
      "NEW.invited_at IS NULL",
      "NEW.raw_user_meta_data->>'tsflow_invitation_nonce' IS DISTINCT FROM v_auth_invite_nonce::text",
      "INSERT INTO public.company_members (company_id, user_id, status, last_active_at)",
      "VALUES (v_pending_company_id, NEW.id, 'Invited', NULL)",
      "INSERT INTO public.user_roles (user_id, company_id, role)",
    ]) {
      expect(branch).toContain(invariant);
      expect(oldBranch).toContain(invariant);
    }
  });
  it("creates only a pending row on self-service signup", () => {
    const branch = trigger.slice(trigger.indexOf("IF v_invitation_id IS NULL THEN"), trigger.indexOf("  -- Preserve live invitation nonce validation semantics."));
    expect(branch).toContain("INSERT INTO public.pending_business_registrations");
    expect(branch).not.toMatch(/INSERT INTO public\.(companies|company_members|user_roles|profiles)/);
    expect(trigger.indexOf("FROM public.company_invitations")).toBeLessThan(trigger.indexOf("tsflow_signup_intent"));
  });
  it("binds provisioning to auth.uid and confirmed matching email before any writes or completed return", () => {
    expect(rpc).toContain("v_uid uuid := auth.uid()");
    expect(rpc).toContain("WHERE user_id = v_uid\n  FOR UPDATE");
    const guard = rpc.indexOf("IF v_confirmed IS NULL OR v_email IS DISTINCT FROM v_reg.email THEN");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(rpc.indexOf("IF v_reg.status = 'completed' THEN"));
    expect(guard).toBeLessThan(rpc.indexOf("INSERT INTO public.companies"));
    expect(rpc).toContain("INSERT INTO public.user_roles (user_id, company_id, role)\n  VALUES (v_uid, v_company_id, 'company_admin')");
  });
  it("locks before idempotent completion checks and excludes browser access to pending rows", () => {
    expect(rpc.indexOf("FOR UPDATE")).toBeLessThan(rpc.indexOf("IF v_reg.status = 'completed' THEN"));
    expect(rpc.indexOf("IF v_reg.status = 'completed' THEN")).toBeLessThan(rpc.indexOf("INSERT INTO public.companies"));
    expect(draft).toContain("REVOKE ALL ON TABLE public.pending_business_registrations FROM PUBLIC, anon, authenticated, service_role");
    expect(draft).toContain("ALTER TABLE public.pending_business_registrations ENABLE ROW LEVEL SECURITY");
    expect(draft).toContain("REVOKE ALL ON FUNCTION public.complete_business_registration() FROM PUBLIC, anon, service_role");
    expect(draft).toContain("GRANT EXECUTE ON FUNCTION public.complete_business_registration() TO authenticated;");
    expect(draft).not.toContain("GRANT EXECUTE ON FUNCTION public.complete_business_registration() TO authenticated, service_role");
    expect(draft).toContain("GRANT EXECUTE ON FUNCTION public.recover_business_registration(text,text,text) TO authenticated;");
    expect(draft).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.recover_business_registration\([^\n]+ TO [^;]*service_role/);
  });

  it("serializes signup, completion, recovery, and invitation creation on normalized email", () => {
    const emailLock = "pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0))";
    expect(trigger).toContain("pg_catalog.pg_advisory_xact_lock(");
    expect(trigger).toContain("pg_catalog.hashtextextended(lower(btrim(COALESCE(NEW.email, ''))), 0)");
    expect(rpc).toContain(emailLock);
    expect(recovery).toContain(emailLock);
    expect(invite).toContain(emailLock);
    expect(recovery).toContain("lower(pg_catalog.btrim(u.email))");
    expect(invite).toContain("lower(pg_catalog.btrim(COALESCE(p_email, '')))" );
  });

  it("makes completion repeat-safe and refuses to duplicate existing Active or Invited memberships", () => {
    const completed = rpc.indexOf("IF v_reg.status = 'completed' THEN");
    const existingMembership = rpc.indexOf("SELECT pg_catalog.count(*), pg_catalog.min(cm.company_id::text)::uuid");
    const createCompany = rpc.indexOf("INSERT INTO public.companies");
    expect(completed).toBeGreaterThan(0);
    expect(existingMembership).toBeGreaterThan(completed);
    expect(existingMembership).toBeLessThan(createCompany);
    expect(rpc).toContain("IF v_active_membership_count > 1 THEN");
    expect(rpc).toContain("ELSIF v_active_membership_count = 1 THEN");
    expect(rpc).toContain("SELECT 1 FROM public.company_members AS cm WHERE cm.user_id = v_uid");
    expect(rpc).toContain("SET status = 'completed', company_id = v_existing_company_id");
    expect(rpc).toContain("IF v_reg.expires_at <= pg_catalog.now() THEN");
    expect(rpc.indexOf("IF v_confirmed IS NULL OR v_email IS DISTINCT FROM v_reg.email THEN")).toBeLessThan(existingMembership);
  });

  it("keeps recovery user-bound, invitation-first, retryable, and idempotent", () => {
    expect(recovery).toContain("v_uid uuid := auth.uid()");
    expect(recovery).toContain("IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'");
    expect(recovery).toContain("IF NOT FOUND OR v_confirmed IS NULL OR v_email IS NULL THEN");
    const invitation = recovery.indexOf("IF EXISTS (");
    const completed = recovery.indexOf("pbr.status = 'completed'");
    const membership = recovery.indexOf("IF EXISTS (SELECT 1 FROM public.company_members AS cm WHERE cm.user_id = v_uid)");
    const pendingInsert = recovery.indexOf("INSERT INTO public.pending_business_registrations");
    expect(invitation).toBeLessThan(membership);
    expect(completed).toBeGreaterThan(invitation);
    expect(completed).toBeLessThan(membership);
    expect(recovery).toContain("RETURN public.complete_business_registration()");
    expect(membership).toBeLessThan(pendingInsert);
    expect(recovery).toContain("WHERE public.pending_business_registrations.status = 'pending'");
    expect(recovery).toContain("SET search_path TO ''");
    expect(draft).toContain("REVOKE ALL ON FUNCTION public.recover_business_registration(text,text,text) FROM PUBLIC, anon, service_role");
  });

  it("makes invitation creation win a race before provisioning and blocks duplicate pending invitations", () => {
    expect(invite).toContain("PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0))");
    expect(invite.indexOf("A pending invitation already exists")).toBeLessThan(invite.indexOf("INSERT INTO public.company_invitations"));
    expect(invite).toContain("cm.status = 'Active'");
    expect(invite).toContain("cm.status = 'Invited'");
    expect(invite).toContain("'Invited', NULL");
    expect(invite).toContain("-- Allow a fresh invitation after expiry or revocation");
    expect(invite.indexOf("DELETE FROM public.company_members AS cm")).toBeLessThan(invite.indexOf("IF v_user_id IS NOT NULL AND EXISTS ("));
    expect(invite).toContain("old_invite.status = 'revoked' OR old_invite.expires_at <= pg_catalog.now()");
    expect(invite).toContain("DELETE FROM public.pending_business_registrations");
    expect(draft).toContain("CREATE UNIQUE INDEX IF NOT EXISTS pending_business_registrations_normalized_email_key");
    expect(rpc.indexOf("FROM public.company_invitations AS ci")).toBeLessThan(rpc.indexOf("INSERT INTO public.companies"));
  });
});
