import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAuditLogHandler,
  type AuditLogDependencies,
  type AuditLogRecord,
} from "../../supabase/functions/_shared/auditLogHandler";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

import { recordAuditEvent } from "@/lib/auditLog";

const companyId = "8f72e8c1-8c30-4c8f-85bc-6a945c5571c2";
const trustedActorId = "58a410a6-7510-4093-8ea9-9dad4088f3da";

function createTestHandler(overrides: Partial<AuditLogDependencies> = {}) {
  const records: AuditLogRecord[] = [];
  const dependencies: AuditLogDependencies = {
    authenticate: vi.fn(async () => trustedActorId),
    isActiveMember: vi.fn(async () => true),
    getActorName: vi.fn(async () => "Trusted Profile"),
    insert: vi.fn(async (record) => {
      records.push(record);
    }),
    ...overrides,
  };
  return { handler: createAuditLogHandler(dependencies), dependencies, records };
}

function auditRequest(
  body: unknown = { company_id: companyId, action: "updated settings", category: "Settings" },
  authorization?: string,
) {
  return new Request("https://example.test/audit-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "192.0.2.42",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("secure audit logging", () => {
  afterEach(() => vi.resetAllMocks());

  it("rejects unauthenticated requests", async () => {
    const { handler, dependencies } = createTestHandler();
    const response = await handler(auditRequest());

    expect(response.status).toBe(401);
    expect(dependencies.authenticate).not.toHaveBeenCalled();
  });

  it("rejects invalid company IDs before membership checks", async () => {
    const { handler, dependencies } = createTestHandler();
    const response = await handler(auditRequest({ company_id: "not-a-uuid", action: "test", category: "Settings" }, "Bearer token"));

    expect(response.status).toBe(400);
    expect(dependencies.isActiveMember).not.toHaveBeenCalled();
  });

  it("denies callers without an active membership", async () => {
    const { handler, dependencies, records } = createTestHandler({
      isActiveMember: vi.fn(async () => false),
    });
    const response = await handler(auditRequest(undefined, "Bearer token"));

    expect(response.status).toBe(403);
    expect(dependencies.insert).not.toHaveBeenCalled();
    expect(records).toHaveLength(0);
  });

  it("derives actor identity from authentication and ignores client IP values", async () => {
    const { handler, records } = createTestHandler();
    const response = await handler(auditRequest({
      company_id: companyId,
      action: "updated settings",
      category: "Settings",
      actor_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      actor_name: "Impersonated User",
      ip: "192.0.2.42",
    }, "Bearer token"));

    expect(response.status).toBe(200);
    expect(records).toEqual([{
      company_id: companyId,
      actor_id: trustedActorId,
      actor_name: "Trusted Profile",
      action: "updated settings",
      target: null,
      category: "Settings",
      ip: null,
    }]);
  });

  it("records valid events for active members", async () => {
    const { handler, dependencies, records } = createTestHandler();
    const response = await handler(auditRequest({
      company_id: companyId,
      action: "updated invoice",
      target: "INV-001",
      category: "Invoice",
    }, "Bearer token"));

    expect(response.status).toBe(200);
    expect(dependencies.isActiveMember).toHaveBeenCalledWith(trustedActorId, companyId);
    expect(records[0]).toMatchObject({
      actor_id: trustedActorId,
      company_id: companyId,
      action: "updated invoice",
      target: "INV-001",
      category: "Invoice",
      ip: null,
    });
  });

  it("uses a safe fallback when trusted profile display name is unavailable", async () => {
    const { handler, records } = createTestHandler({
      getActorName: vi.fn(async () => null),
    });
    const response = await handler(auditRequest(undefined, "Bearer token"));

    expect(response.status).toBe(200);
    expect(records[0].actor_name).toBe("User");
  });

  it("validates category and event text lengths", async () => {
    const { handler, records } = createTestHandler();
    const invalidCategory = await handler(auditRequest({
      company_id: companyId,
      action: "test",
      category: "Unexpected",
    }, "Bearer token"));
    const oversizedAction = await handler(auditRequest({
      company_id: companyId,
      action: "x".repeat(201),
      category: "Settings",
    }, "Bearer token"));
    const oversizedTarget = await handler(auditRequest({
      company_id: companyId,
      action: "test",
      category: "Settings",
      target: "x".repeat(201),
    }, "Bearer token"));

    expect(invalidCategory.status).toBe(400);
    expect(oversizedAction.status).toBe(400);
    expect(oversizedTarget.status).toBe(400);
    expect(records).toHaveLength(0);
  });

  it("routes frontend audit events through the Edge Function and surfaces failures", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(recordAuditEvent({
      company_id: companyId,
      action: "imported demo data",
      category: "Settings",
    })).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("audit-log", {
      body: {
        company_id: companyId,
        action: "imported demo data",
        category: "Settings",
      },
    });

    invoke.mockResolvedValueOnce({ data: { ok: false }, error: null });
    await expect(recordAuditEvent({
      company_id: companyId,
      action: "imported demo data",
      category: "Settings",
    })).rejects.toThrow("The audit event could not be recorded.");
  });

  it("keeps authenticated read access while revoking direct client inserts", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20261028090000_secure_audit_log_writes.sql"),
      "utf8",
    );
    const initialSchema = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20260425200257_77893d59-9b77-49c9-b0ae-4674118e9dd3.sql"),
      "utf8",
    );

    expect(migration).toMatch(/REVOKE INSERT ON TABLE public\.audit_logs FROM PUBLIC, anon, authenticated;/);
    expect(migration).toMatch(/DROP POLICY IF EXISTS "Members can append audit logs" ON public\.audit_logs;/);
    expect(migration).toMatch(/GRANT INSERT ON TABLE public\.audit_logs TO service_role;/);
    expect(initialSchema).toMatch(/CREATE POLICY "Members view audit logs"\s+ON public\.audit_logs FOR SELECT TO authenticated\s+USING \(public\.is_company_member\(auth\.uid\(\), company_id\)\);/);
    expect(migration).not.toMatch(/REVOKE SELECT|DROP POLICY[^;]*"Members view audit logs"/);
  });

  it("does not seed audit rows directly and records only after demo inserts complete", () => {
    const source = readFileSync(resolve(process.cwd(), "src/hooks/useCompanyData.ts"), "utf8");
    const seedFunction = source.slice(source.indexOf("export async function seedDemoData"));

    expect(seedFunction).not.toMatch(/\.from\(["']audit_logs["']\)\s*\.insert/);
    expect(seedFunction).toContain("await recordAuditEvent(");
    expect(seedFunction.lastIndexOf("await recordAuditEvent("))
      .toBeGreaterThan(seedFunction.lastIndexOf("if (invoiceLinesError)"));
  });
});
