import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { getCurrentUser, signOutFromSession, type SessionUser } from "@/lib/authSession";
import { acceptTenantInvitation, loadActiveMembership } from "@/lib/tenantAdmin";

type Role = "super_admin" | "company_admin" | "finance_officer" | "staff_user";

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  authError: string | null;
  companyId: string | null;
  roles: Role[];
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshSession: (forceReload?: boolean) => Promise<SessionUser | null>;
  refreshMembership: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const currentUid = useRef<string | null>(null);
  const membershipRequest = useRef(0);
  const sessionRequest = useRef(0);
  const loadedUid = useRef<string | null>(null);

  const loadMembership = useCallback(async (uid: string) => {
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
  }, []);

  const refreshSession = useCallback(async (forceReload = false): Promise<SessionUser | null> => {
    const request = ++sessionRequest.current;
    setAuthError(null);
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (request !== sessionRequest.current) return null;
      const uid = currentUser?.id ?? null;
      currentUid.current = uid;
      setUser(currentUser);
      if (!uid) {
        loadedUid.current = null;
        ++membershipRequest.current;
        setCompanyId(null);
        setRoles([]);
        setLoading(false);
        return null;
      }

      if (loadedUid.current === uid && !forceReload) {
        setLoading(false);
        return currentUser;
      }
      loadedUid.current = uid;
      ++membershipRequest.current;
      setCompanyId(null);
      setRoles([]);

      if (window.location.pathname.replace(/\/$/, "") === "/auth/accept-invite") {
        setLoading(false);
        return currentUser;
      }

      await acceptTenantInvitation();
      if (request !== sessionRequest.current || currentUid.current !== uid) return null;
      await loadMembership(uid);
      if (request === sessionRequest.current) setLoading(false);
      return currentUser;
    } catch (error) {
      if (request === sessionRequest.current) {
        currentUid.current = null;
        loadedUid.current = null;
        ++membershipRequest.current;
        setUser(null);
        setCompanyId(null);
        setRoles([]);
        setAuthError(error instanceof Error ? error.message : "Session validation failed.");
        setLoading(false);
      }
      return null;
    }
  }, [loadMembership]);

  useEffect(() => {
    let disposed = false;
    const activeSessionRequest = sessionRequest;
    const activeMembershipRequest = membershipRequest;
    const loadOnFocus = () => {
      if (!disposed) void refreshSession();
    };
    void refreshSession();
    window.addEventListener("focus", loadOnFocus);
    return () => {
      disposed = true;
      ++activeSessionRequest.current;
      ++activeMembershipRequest.current;
      window.removeEventListener("focus", loadOnFocus);
    };
  }, [refreshSession]);

  const signOut = async () => {
    await signOutFromSession();
    ++sessionRequest.current;
    ++membershipRequest.current;
    currentUid.current = null;
    loadedUid.current = null;
    setUser(null);
    setCompanyId(null);
    setRoles([]);
    setAuthError(null);
    setLoading(false);
  };

  const refreshMembership = async () => {
    const uid = currentUid.current;
    if (uid) await loadMembership(uid);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        authError,
        companyId,
        roles,
        isSuperAdmin: roles.includes("super_admin"),
        signOut,
        refreshSession,
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