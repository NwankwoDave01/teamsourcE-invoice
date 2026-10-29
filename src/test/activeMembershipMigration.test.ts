import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261029000000_require_active_membership_for_company_management.sql"),
  "utf8",
);
const inviteMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261028152628_enforce_invitation_only_auth_user_creation.sql"),
  "utf8",
);

function functionBody(name: string) {
  return migration.match(
    new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`),
  )?.[1];
}

describe("active-membership authorization migration", () => {
  it("denies company and invoice permissions to pending invitees with seeded roles", () => {
    const companyPermission = functionBody("can_manage_company");
    const invoicePermission = functionBody("can_manage_invoices");

    expect(inviteMigration).toMatch(/VALUES \(v_pending_company_id, NEW\.id, 'Invited', NULL\)/);
    expect(inviteMigration).toMatch(/INSERT INTO public\.user_roles \(user_id, company_id, role\)\s*VALUES \(NEW\.id, v_pending_company_id, v_invitation_role\)/);
    expect(companyPermission).toMatch(/status = 'Active'/);
    expect(companyPermission).toMatch(/public\.has_role\(_user_id, 'company_admin', _company_id\)/);
    expect(invoicePermission).toMatch(/status = 'Active'/);
    expect(invoicePermission).toMatch(/public\.has_role\(_user_id, 'finance_officer', _company_id\)/);
  });

  it("keeps active company administrators and finance officers authorized only for their role", () => {
    const companyPermission = functionBody("can_manage_company");
    const invoicePermission = functionBody("can_manage_invoices");

    expect(companyPermission).toMatch(/status = 'Active'[\s\S]*public\.has_role\(_user_id, 'company_admin', _company_id\)/);
    expect(companyPermission).not.toMatch(/public\.has_role\(_user_id, 'finance_officer'/);
    expect(companyPermission).not.toMatch(/public\.has_role\(_user_id, 'staff_user'/);
    expect(invoicePermission).toMatch(/status = 'Active'[\s\S]*public\.has_role\(_user_id, 'company_admin', _company_id\)/);
    expect(invoicePermission).toMatch(/public\.has_role\(_user_id, 'finance_officer', _company_id\)/);
    expect(invoicePermission).not.toMatch(/public\.has_role\(_user_id, 'staff_user'/);
  });

  it("recognizes only NULL-company super-admin roles and blocks tenant admins from assigning one", () => {
    const superAdmin = functionBody("is_super_admin");
    expect(superAdmin).toMatch(/role = 'super_admin'[\s\S]*company_id IS NULL/);
    expect(migration).toMatch(/DROP POLICY IF EXISTS "Company admins can grant roles in their company"/);
    expect(migration).toMatch(/role <> 'super_admin'::public\.app_role[\s\S]*public\.can_manage_company\(auth\.uid\(\), company_id\)/);
    expect(migration).toMatch(/public\.is_super_admin\(auth\.uid\(\)\)[\s\S]*\(role <> 'super_admin'::public\.app_role OR company_id IS NULL\)/);
  });

  it("revokes only TRUNCATE from untrusted database roles", () => {
    expect(migration).toMatch(/REVOKE TRUNCATE ON TABLE public\.user_roles FROM PUBLIC, anon, authenticated/);
  });

  it("keeps the explicit global super-admin exception in both management helpers", () => {
    expect(functionBody("can_manage_company")).toMatch(/^\s*SELECT public\.is_super_admin\(_user_id\)/);
    expect(functionBody("can_manage_invoices")).toMatch(/^\s*SELECT public\.is_super_admin\(_user_id\)/);
  });
});
