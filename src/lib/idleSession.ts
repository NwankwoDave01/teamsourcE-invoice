export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const IDLE_WARNING_MS = 2 * 60 * 1000;
export const SIGN_OUT_KEY = "tsflow:sign-out";
export const idleKey = (uid: string) => `tsflow:idle:${uid}`;
export type IdleRecord = { at: number; status: "active" | "expired" };

export function parseIdleRecord(value: string | null, now = Date.now()): IdleRecord | null {
  try {
    const record = JSON.parse(value ?? "null");
    return record && Number.isFinite(record.at) && record.at > 0 && record.at <= now
      && (record.status === "active" || record.status === "expired")
      ? { at: record.at, status: record.status } : null;
  } catch { return null; }
}

export function readIdle(uid: string): IdleRecord | null {
  try { return parseIdleRecord(localStorage.getItem(idleKey(uid))); } catch { return null; }
}

export function writeIdle(uid: string, record: IdleRecord) {
  try { localStorage.setItem(idleKey(uid), JSON.stringify(record)); } catch { /* In-memory expiry still applies. */ }
}

export function startIdleSession(uid: string) {
  writeIdle(uid, { at: Date.now(), status: "active" });
}

export function isAuthenticatedPath(path: string) {
  return /^\/(app|admin)(\/|$)/.test(path);
}

/** Wall-clock deadlines survive suspended timers; no polling/focus activity API. */
export class IdleDeadline {
  record: IdleRecord;
  constructor(record: IdleRecord | null, now: number) {
    this.record = record ?? { at: now, status: "active" };
  }
  remaining(now: number) { return Math.max(0, this.record.at + IDLE_TIMEOUT_MS - now); }
  expired(now: number) { return this.record.status === "expired" || this.remaining(now) === 0; }
  warning(now: number) { return !this.expired(now) && this.remaining(now) <= IDLE_WARNING_MS; }
  activity(now: number, visible: boolean) {
    if (!visible || this.expired(now) || this.warning(now)) return false;
    this.record = { at: now, status: "active" };
    return true;
  }
  sync(record: IdleRecord, now: number) {
    if (this.expired(now)) return;
    if (record.status === "expired" || record.at > this.record.at) this.record = record;
  }
  async stay(now: () => number, validate: () => Promise<boolean>) {
    if (this.expired(now())) return false;
    if (!await validate() || this.expired(now())) return false;
    this.record = { at: now(), status: "active" };
    return true;
  }
}