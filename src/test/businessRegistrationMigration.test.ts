import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const draft = readFileSync("supabase/pending-migrations/20261109153000_self_service_business_registration.sql", "utf8");
const previous = readFileSync("supabase/migrations/20261028152628_enforce_invitation_only_auth_user_creation.sql", "utf8");
const trigger = draft.split("CREATE OR REPLACE FUNCTION public.handle_new_user()")[1]?.split("$function$;")[0] ?? "";
const rpc = draft.split("CREATE OR REPLACE FUNCTION public.complete_business_registration()")[1]?.split("$function$;")[0] ?? "";

// Source guards only. These do NOT establish live schema readiness or DB runtime behavior.
describe("staged registration SQL safety guards", () => {
  it("keeps the existing invitation nonce and inactive membership branch byte-for-byte", () => {
    const start = "  -- Keep the one-time nonce check";
    const end = "  RETURN NEW;";
    expect(trigger.slice(trigger.indexOf(start), trigger.lastIndexOf(end)))
      .toBe(previous.slice(previous.indexOf(start), previous.lastIndexOf(end)));
  });
  it("creates only a pending row on self-service signup", () => {
    const branch = trigger.slice(trigger.indexOf("IF v_invitation_id IS NULL THEN"), trigger.indexOf("  -- Keep the one-time nonce check"));
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
    expect(rpc).toContain("VALUES (v_company_id, v_uid, 'company_admin')");
  });
  it("locks before idempotent completion checks and excludes browser access to pending rows", () => {
    expect(rpc.indexOf("FOR UPDATE")).toBeLessThan(rpc.indexOf("IF v_reg.status = 'completed' THEN"));
    expect(rpc.indexOf("IF v_reg.status = 'completed' THEN")).toBeLessThan(rpc.indexOf("INSERT INTO public.companies"));
    expect(draft).toContain("REVOKE ALL ON public.pending_business_registrations FROM PUBLIC, anon, authenticated");
    expect(draft).toContain("ALTER TABLE public.pending_business_registrations ENABLE ROW LEVEL SECURITY");
    expect(draft).toContain("REVOKE ALL ON FUNCTION public.complete_business_registration() FROM PUBLIC, anon");
  });
});