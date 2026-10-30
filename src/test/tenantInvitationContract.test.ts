import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const endpoint = readFileSync(
  resolve(process.cwd(), "supabase/functions/tenant-admin/index.ts"),
  "utf8",
);
const invitationIndexMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030100300_scope_pending_invitation_uniqueness.sql"),
  "utf8",
);
const inviteHandler = endpoint.slice(endpoint.indexOf('if (action === "invite")'), endpoint.indexOf('if (action === "set_role")'));
const acceptanceHandler = endpoint.slice(endpoint.indexOf('if (isAcceptance)'), endpoint.indexOf('if (!companyId)'));

describe("tenant invitation safeguards", () => {
  it("allows verified existing accounts to see scoped pending invitations", () => {
    const statusHandler = endpoint.slice(endpoint.indexOf('if (action === "invitation_status")'), endpoint.indexOf("if (isAcceptance)"));
    expect(statusHandler).toMatch(/if \(!actor\.email_confirmed_at\)/);
    expect(statusHandler).toMatch(/\.eq\("email", actor\.email\.toLowerCase\(\)\)/);
    expect(statusHandler).toMatch(/\.eq\("status", "pending"\)/);
    expect(statusHandler).toMatch(/\.gt\("expires_at"/);
    expect(statusHandler).not.toMatch(/if\s*\(!actor\.invited_at\)/);
  });

  it("requires a verified matching email and preserves the existing acceptance RPC call", () => {
    expect(acceptanceHandler).toMatch(/if \(!actor\.email_confirmed_at\)/);
    expect(acceptanceHandler).toMatch(/\.eq\("email", actor\.email\.toLowerCase\(\)\)/);
    expect(acceptanceHandler).toMatch(/\.eq\("status", "pending"\)/);
    expect(acceptanceHandler).toMatch(/\.gt\("expires_at"/);
    expect(acceptanceHandler).toMatch(/if \(!invitation\) return json\(\{ ok: false, error: "No pending invitation" \}, 409\)/);
    expect(acceptanceHandler).toMatch(/admin\.rpc\("tenant_admin_accept_invitation"/);
    expect(acceptanceHandler).toMatch(/p_user_id: actor\.id/);
    expect(acceptanceHandler).toMatch(/p_email: actor\.email\.toLowerCase\(\)/);
    expect(acceptanceHandler).not.toMatch(/actor\.invited_at/);
  });

  it("limits expiry and duplicate checks to the authorized company", () => {
    expect(inviteHandler).toMatch(/\.update\(\{ status: "revoked" \}\)\.eq\("company_id", companyId\)/);
    expect(inviteHandler).toMatch(/\.eq\("company_id", companyId\)\.eq\("email", email\)/);
    expect(invitationIndexMigration).toMatch(/UNIQUE INDEX IF NOT EXISTS/);
    expect(invitationIndexMigration).toMatch(/\(company_id, lower\(email\)\)/);
    expect(invitationIndexMigration).toMatch(/WHERE status = 'pending'/);
  });

  it("creates only an inactive invitation for existing accounts and preserves other memberships", () => {
    const existingAccountBranch = inviteHandler.slice(
      inviteHandler.indexOf("if (existingUser)"),
      inviteHandler.indexOf("// Bind Auth user creation"),
    );
    expect(existingAccountBranch).toMatch(/status: "Invited"/);
    expect(existingAccountBranch).not.toMatch(/status: "Active"/);
    expect(existingAccountBranch).not.toMatch(/\.eq\("user_id", existingUser\.id\);/);
    expect(existingAccountBranch).toMatch(/mode: "invitation_pending"/);
  });

  it("does not grant platform or owner roles through an invitation", () => {
    expect(endpoint).toMatch(/const allowedRoles = new Set\(\["company_admin", "finance_officer", "staff_user"\]\)/);
  });
});
