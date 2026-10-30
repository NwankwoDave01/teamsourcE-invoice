import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030100100_open_registration_and_company_creation.sql"),
  "utf8",
);
const ownerRoleMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030100000_add_company_owner_role.sql"),
  "utf8",
);
const triggerFunction = migration.match(
  /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?AS \$function\$([\s\S]*?)\$function\$;/,
)?.[1];
const companyCreationFunction = migration.match(
  /CREATE OR REPLACE FUNCTION public\.create_company_with_owner\([\s\S]*?AS \$function\$([\s\S]*?)\$function\$;/,
)?.[1];

describe("open registration and secure company creation migration", () => {
  it("creates only a profile for a normal signup and keeps invited accounts inactive", () => {
    expect(triggerFunction).toBeDefined();
    expect(triggerFunction).toMatch(/INSERT INTO public\.profiles/);
    expect(triggerFunction).toMatch(/IF v_is_server_invitation THEN/);
    expect(triggerFunction).toMatch(/VALUES \(v_pending_company_id, NEW\.id, 'Invited', NULL\)/);
    expect(triggerFunction).not.toMatch(/INSERT INTO public\.companies/i);
    expect(triggerFunction).not.toMatch(/VALUES\s*\([^;]*'Active'/is);
    expect(triggerFunction).not.toMatch(/Workspace access is invitation-only/i);
  });

  it("atomically creates a company, active membership, and owner role for the verified JWT user", () => {
    expect(companyCreationFunction).toBeDefined();
    expect(companyCreationFunction).toMatch(/v_user_id uuid := auth\.uid\(\)/);
    expect(companyCreationFunction).toMatch(/email_confirmed_at/);
    expect(companyCreationFunction).toMatch(/pg_advisory_xact_lock/);
    expect(companyCreationFunction).toMatch(/INSERT INTO public\.companies/);
    expect(companyCreationFunction).toMatch(/INSERT INTO public\.company_members/);
    expect(companyCreationFunction).toMatch(/INSERT INTO public\.user_roles/);
    expect(companyCreationFunction).toMatch(/'company_owner'::public\.app_role/);
    expect(companyCreationFunction).not.toMatch(/p_user_id|p_owner_id/);
  });

  it("allows multiple workspaces while enforcing a configurable, serialized daily quota", () => {
    expect(migration).toMatch(/creations_per_user_per_day integer NOT NULL DEFAULT 5/);
    expect(companyCreationFunction).toMatch(/pg_advisory_xact_lock/);
    expect(companyCreationFunction).toMatch(/v_company_count >= v_daily_limit/);
    expect(companyCreationFunction).toMatch(/created_at >= now\(\) - interval '24 hours'/);
    expect(companyCreationFunction).not.toMatch(/one company|company_count\s*>\s*0/i);
  });

  it("prevents company administrators from granting owner or platform roles", () => {
    expect(ownerRoleMigration).toMatch(/ADD VALUE IF NOT EXISTS 'company_owner'/);
    expect(migration).toMatch(/role NOT IN \([\s\S]*'super_admin'::public\.app_role,[\s\S]*'company_owner'::public\.app_role/);
    expect(migration).toMatch(/public\.can_manage_company\(auth\.uid\(\), company_id\)/);
  });
});
