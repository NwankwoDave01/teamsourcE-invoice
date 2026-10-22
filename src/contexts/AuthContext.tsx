import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { acceptTenantInvitation, loadActiveMembership } from "@/lib/tenantAdmin";

type Role = "super_admin" | "company_admin" | "finance_officer" | "staff_user";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companyId: string | null;
  roles: Role[];
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const currentUid = useRef<string | null>(null);
  const membershipRequest = useRef(0);

  const loadMembership = async (uid: string) => {
    const request = ++membershipRequest.current;
    try {
      const membership = await loadActiveMembership(uid);
      if (currentUid.current !== uid || request !== membershipRequest.current) return;
      setCompanyId(membership.companyId);
      setRoles(membership.roles as Role[]);
    } catch {
      if (currentUid.current !== uid || request !== membershipRequest.current) return;
      setCompanyId(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    let disposed = false;
    let loadedUid: string | null = null;
    let generation = 0;
    let receivedAuthEvent = false;
    const applySession = (sess: Session | null) => {
      if (disposed) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      const uid = sess?.user.id ?? null;
      currentUid.current = uid;
      if (uid && loadedUid === uid) return;
      loadedUid = uid;
      const run = ++generation;
      ++membershipRequest.current;
      setCompanyId(null);
      setRoles([]);
      setLoading(!!uid);
      if (!uid) return;
      // Defer authenticated requests outside the auth callback. Initial-session
      // and getSession duplicates share this run; token refresh does not trigger duplicate loads.
      setTimeout(async () => {
        if (disposed || run !== generation) return;
        // The invite-link page owns password setup and explicit acceptance.
        // Other session loads reconcile eligible invitations once; refresh events
        // for the same user must not repeat this request.
        if (window.location.pathname.replace(/\/$/, "") !== "/auth/accept-invite") {
          try {
            await acceptTenantInvitation();
          } catch {
            // No eligible invitation is normal. Access still requires the
            // subsequent server-owned Active membership read to succeed.
          }
        }
        if (disposed || run !== generation || currentUid.current !== uid) return;
        await loadMembership(uid);
        if (!disposed && run === generation) setLoading(false);
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      receivedAuthEvent = true;
      applySession(sess);
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      // An auth event that already loaded a user wins over the initial read.
      if (!receivedAuthEvent) applySession(sess);
    }).catch(() => {
      if (!disposed && !loadedUid) {
        applySession(null);
      }
    });
    return () => { disposed = true; ++generation; ++membershipRequest.current; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshMembership = async () => {
    const uid = currentUid.current;
    if (uid) await loadMembership(uid);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        companyId,
        roles,
        isSuperAdmin: roles.includes("super_admin"),
        signOut,
        refreshMembership,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};