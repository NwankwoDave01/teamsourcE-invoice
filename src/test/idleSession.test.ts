import { describe, expect, it, vi } from "vitest";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, IdleDeadline, isAuthenticatedPath, parseIdleRecord } from "@/lib/idleSession";

const start = 1_800_000_000_000;
const clock = () => new IdleDeadline({ at: start, status: "active" }, start);

describe("inactivity deadlines", () => {
  it("warns at exactly 58 minutes and expires at exactly 60 minutes", () => {
    const idle = clock();
    expect(IDLE_TIMEOUT_MS).toBe(3_600_000);
    expect(IDLE_WARNING_MS).toBe(120_000);
    expect(idle.warning(start + 58 * 60_000 - 1)).toBe(false);
    expect(idle.warning(start + 58 * 60_000)).toBe(true);
    expect(idle.remaining(start + 58 * 60_000)).toBe(120_000);
    expect(idle.expired(start + 60 * 60_000 - 1)).toBe(false);
    expect(idle.expired(start + 60 * 60_000)).toBe(true);
  });
  it("renews only visible activity before warning, never hidden activity or expired sessions", () => {
    const idle = clock();
    expect(idle.activity(start + 10_000, false)).toBe(false);
    expect(idle.record.at).toBe(start);
    expect(idle.activity(start + 20_000, true)).toBe(true);
    expect(idle.record.at).toBe(start + 20_000);
    expect(idle.activity(start + 20_000 + 58 * 60_000, true)).toBe(false);
    expect(idle.activity(start + 20_000 + 60 * 60_000, true)).toBe(false);
  });
  it("handles browser sleep using wall-clock time rather than timer ticks", () => {
    expect(clock().expired(start + 70 * 60_000)).toBe(true);
  });
  it("resets only after successful server validation and rejects late validation", async () => {
    const idle = clock();
    let now = start + 58 * 60_000;
    expect(await idle.stay(() => now, async () => false)).toBe(false);
    expect(idle.record.at).toBe(start);
    expect(await idle.stay(() => now, async () => true)).toBe(true);
    expect(idle.record.at).toBe(now);
    const late = clock();
    expect(await late.stay(() => start + 59 * 60_000, async () => { throw new Error("offline"); }).catch(() => false)).toBe(false);
    expect(late.record.at).toBe(start);
    now = start + 59 * 60_000;
    expect(await late.stay(() => now, async () => { now = start + 60 * 60_000; return true; })).toBe(false);
    const validate = vi.fn(async () => true);
    expect(await late.stay(() => now, validate)).toBe(false);
    expect(validate).not.toHaveBeenCalled();
  });
  it("synchronizes genuine activity but cannot resurrect expired tabs or use stale timestamps", () => {
    const idle = clock();
    idle.sync({ at: start + 10_000, status: "active" }, start + 20_000);
    expect(idle.record.at).toBe(start + 10_000);
    idle.sync({ at: start, status: "active" }, start + 20_000);
    expect(idle.record.at).toBe(start + 10_000);
    idle.sync({ at: start + 20_000, status: "expired" }, start + 20_000);
    idle.sync({ at: start + 30_000, status: "active" }, start + 30_000);
    expect(idle.expired(start + 30_000)).toBe(true);
    const sleeping = clock();
    sleeping.sync({ at: start + 60 * 60_000, status: "active" }, start + 60 * 60_000);
    expect(sleeping.expired(start + 60 * 60_000)).toBe(true);
  });
  it.each(["/", "/auth/login", "/auth/signup", "/auth/confirm", "/auth/accept-invite", "/api-docs", "/application"])("excludes %s", (path) => {
    expect(isAuthenticatedPath(path)).toBe(false);
  });
  it.each(["/app", "/app/dashboard", "/admin/overview"])("includes %s", (path) => {
    expect(isAuthenticatedPath(path)).toBe(true);
  });
  it("accepts timestamp/status only and rejects malformed or future records", () => {
    expect(parseIdleRecord(JSON.stringify({ at: start, status: "active", unwanted: "discard" }), start)).toEqual({ at: start, status: "active" });
    for (const value of ["bad", "null", '{"at":0,"status":"active"}', JSON.stringify({ at: start + 1, status: "active" }), JSON.stringify({ at: start, status: "token" })]) {
      expect(parseIdleRecord(value, start)).toBeNull();
    }
  });
});