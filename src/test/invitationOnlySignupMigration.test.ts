import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261028152628_enforce_invitation_only_auth_user_creation.sql"),
  "utf8",
);
const triggerFunction = migration.match(
  /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?AS \$function\$([\s\S]*?)\$function\$;/,
)?.[1];

describe("invitation-only signup migration", () => {
  it("rejects missing invitations before any profile or tenant membership writes", () => {
    expect(triggerFunction).toBeDefined();
    const missingInvitationGuard = triggerFunction!.indexOf("IF v_invitation_id IS NULL THEN");
    const profileWrite = triggerFunction!.indexOf("INSERT INTO public.profiles");

    expect(missingInvitationGuard).toBeGreaterThanOrEqual(0);
    expect(profileWrite).toBeGreaterThan(missingInvitationGuard);
    expect(triggerFunction).toMatch(/RAISE EXCEPTION 'Workspace access is invitation-only/);
    expect(triggerFunction).not.toMatch(/INSERT INTO public\.companies/i);
    expect(triggerFunction).not.toMatch(/VALUES\s*\([^;]*'Active'/is);
  });

  it("rejects missing, mismatched, or already-consumed invite nonces before writes", () => {
    expect(triggerFunction).toBeDefined();
    const nonceGuard = triggerFunction!.indexOf("IF NEW.invited_at IS NULL");
    const profileWrite = triggerFunction!.indexOf("INSERT INTO public.profiles");

    expect(triggerFunction).toMatch(/ci\.auth_invite_nonce/);
    expect(triggerFunction).toMatch(/v_auth_invite_nonce IS NULL/);
    expect(triggerFunction).toMatch(/tsflow_invitation_nonce'\s+IS DISTINCT FROM v_auth_invite_nonce::text/);
    expect(triggerFunction).toMatch(/ci\.status = 'pending'/);
    expect(triggerFunction).toMatch(/ci\.expires_at > now\(\)/);
    expect(nonceGuard).toBeGreaterThanOrEqual(0);
    expect(profileWrite).toBeGreaterThan(nonceGuard);
  });

  it("keeps legitimate invited users inactive until explicit invitation acceptance", () => {
    expect(triggerFunction).toMatch(/VALUES \(v_pending_company_id, NEW\.id, 'Invited', NULL\)/);
    expect(triggerFunction).not.toMatch(/VALUES\s*\([^;]*'Active'/is);
  });
});
