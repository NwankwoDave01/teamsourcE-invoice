import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { IdleDeadline, idleKey, isAuthenticatedPath, parseIdleRecord, readIdle, writeIdle } from "@/lib/idleSession";

export function IdleSession() {
  const auth = useAuth();
  const currentAuth = useRef(auth);
  currentAuth.current = auth;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = isAuthenticatedPath(pathname);
  const uid = auth.user?.id;
  const deadline = useRef<IdleDeadline | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (active && auth.signOutReason) navigate("/auth/login", { replace: true, state: { reason: auth.signOutReason } });
  }, [active, auth.signOutReason, navigate]);

  useEffect(() => {
    setRemaining(null);
    setError("");
    if (!active || !uid) { deadline.current = null; return; }
    const clock = new IdleDeadline(readIdle(uid), Date.now());
    deadline.current = clock;
    writeIdle(uid, clock.record);
    let stopped = false;
    const check = () => {
      if (stopped) return;
      const now = Date.now();
      if (clock.expired(now)) {
        stopped = true;
        writeIdle(uid, { at: clock.record.at, status: "expired" });
        setRemaining(null);
        void currentAuth.current.signOut("session_expired").catch(() => undefined);
        return;
      }
      setRemaining(clock.warning(now) ? Math.ceil(clock.remaining(now) / 1000) : null);
    };
    const activity = (event: Event) => {
      // Synthetic events and hidden pages are not meaningful user activity.
      if (!event.isTrusted) return;
      const now = Date.now();
      check();
      if (now - clock.record.at < 1000) return;
      if (clock.activity(now, document.visibilityState === "visible")) {
        writeIdle(uid, clock.record);
        check();
      }
    };
    const synchronize = (event: StorageEvent) => {
      if (event.key !== idleKey(uid)) return;
      const record = parseIdleRecord(event.newValue);
      if (record) { clock.sync(record, Date.now()); check(); }
    };
    const visibility = () => { if (document.visibilityState === "visible") check(); };
    const events = ["pointermove", "mousemove", "pointerdown", "keydown", "touchstart", "touchmove", "scroll", "click"];
    events.forEach((event) => document.addEventListener(event, activity, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", check);
    window.addEventListener("storage", synchronize);
    const interval = window.setInterval(check, 1000);
    check();
    return () => {
      stopped = true;
      window.clearInterval(interval);
      events.forEach((event) => document.removeEventListener(event, activity, true));
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("storage", synchronize);
    };
  }, [active, uid]);

  const stay = async () => {
    const clock = deadline.current;
    if (!clock || !uid || busy) return;
    if (clock.expired(Date.now())) { await auth.signOut("session_expired").catch(() => undefined); return; }
    setBusy(true);
    setError("");
    try {
      const continued = await clock.stay(Date.now, async () => (await currentAuth.current.refreshSession())?.id === uid);
      if (continued) { writeIdle(uid, clock.record); setRemaining(null); }
      else if (clock.expired(Date.now()) || !currentAuth.current.user) await currentAuth.current.signOut("session_expired");
      else setError("Your session could not be verified. Try again before the countdown ends.");
    } catch { setError("Your session could not be verified. Try again before the countdown ends."); }
    finally { setBusy(false); }
  };

  return <AlertDialog open={active && Boolean(uid) && remaining !== null}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you still there?</AlertDialogTitle>
        <AlertDialogDescription>Your session will expire due to inactivity in {Math.floor((remaining ?? 0) / 60)}:{String((remaining ?? 0) % 60).padStart(2, "0")}.</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter>
        <Button type="button" variant="outline" onClick={() => void auth.signOut("signed_out").catch(() => undefined)}>Sign out</Button>
        <Button type="button" disabled={busy} onClick={() => void stay()}>{busy ? "Checking session…" : "Stay signed in"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}