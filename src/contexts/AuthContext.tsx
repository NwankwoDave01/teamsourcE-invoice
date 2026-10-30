import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { getCurrentUser, signOutFromSession, type SessionUser } from "@/lib/authSession";
import { loadActiveMembership, loadUserRoles } from "@/lib/tenantAdmin";

type Role = "super_admin" | "company_admin" | "finance_officer" | "staff_user";

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  authError: string | null;
  membershipError: string | null;
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
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const currentUid = useRef<string | null>(null);
  const membershipRequest = useRef(0);
  const sessionRequest = useRef(0);
  const loadedUid = useRef<string | null>(null);

  const loadMembership = useCallback(async (uid: string) => {
    const request = ++membershipRequest.current;
    setMembershipError(null);
    const [membershipResult, rolesResult] = await Promise.allSettled([
      loadActiveMembership(uid),
      loadUserRoles(uid),
    ]);
    if (currentUid.current !== uid || request !== membershipRequest.current) return;

    const activeCompanyId = membershipResult.status === "fulfilled"
      ? membershipResult.value.companyId
      : null;
    setCompanyId(activeCompanyId);

    const validRoles = new Set<Role>(["super_admin", "company_admin", "finance_officer", "staff_user"]);
    const loadedRoles = rolesResult.status === "fulfilled"
      ? rolesResult.value
        .filter((role) => validRoles.has(role.role as Role)
          && (role.role === "super_admin" || (activeCompanyId && role.companyId === activeCompanyId)))
        .map((role) => role.role as Role)
      : [];
    setRoles(loadedRoles);

    const errors = [
      membershipResult.status === "rejected" ? "Company membership could not be loaded." : null,
      rolesResult.status === "rejected" ? "User roles could not be loaded." : null,
    ].filter(Boolean);
    setMembershipError(errors.length ? `${errors.join(" ")} Retry to check company access.` : null);
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
        setMembershipError(null);
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
      setMembershipError(null);
      setCompanyId(null);
      setRoles([]);

      if (window.location.pathname.replace(/\/$/, "") === "/auth/accept-invite") {
        setLoading(false);
        return currentUser;
      }

      await loadMembership(uid);
      if (request === sessionRequest.current) setLoading(false);
      return currentUser;
    } catch (error) {
      if (request === sessionRequest.current) {
        setAuthError(error instanceof Error ? error.message : "Session validation failed.");
        setLoading(false);
      }
      throw error;
    }
  }, [loadMembership]);

  useEffect(() => {
    let disposed = false;
    const activeSessionRequest = sessionRequest;
    const activeMembershipRequest = membershipRequest;
    const loadOnFocus = () => {
      if (!disposed) void refreshSession().catch(() => undefined);
    };
    void refreshSession().catch(() => undefined);
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
    setMembershipError(null);
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
        membershipError,
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