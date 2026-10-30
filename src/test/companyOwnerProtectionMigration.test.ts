import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030100200_protect_company_owner.sql"),
  "utf8",
);

describe("company owner protection migration", () => {
  it("only permits authenticated initial ownership for the active company creator", () => {
    expect(migration).toMatch(/NEW\.user_id <> v_actor_id/);
    expect(migration).toMatch(/c\.created_by = v_actor_id/);
    expect(migration).toMatch(/cm\.status = 'Active'::public\.member_status/);
    expect(migration).toMatch(/NEW\.company_id IS NULL/);
  });

  it("blocks removal or downgrade of the last active company owner", () => {
    expect(migration).toMatch(/prevent_last_active_company_owner_role_removal/);
    expect(migration).toMatch(/prevent_last_active_company_owner_membership_removal/);
    expect(migration).toMatch(/FOR UPDATE/);
    expect(migration).toMatch(/Transfer company ownership before removing or downgrading the last active owner/);
    expect(migration).toMatch(/Transfer company ownership before disabling or removing the last active owner/);
  });

  it("does not grant ownership-transfer or platform-role authority to tenant administrators", () => {
    expect(migration).not.toMatch(/tenant_admin_transfer_owner/);
    expect(migration).not.toMatch(/super_admin/);
  });
});
