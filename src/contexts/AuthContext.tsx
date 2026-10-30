import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { getCurrentUser, signOutFromSession, type SessionUser } from "@/lib/authSession";
import { loadActiveMemberships, loadUserRoles, type ActiveCompanyMembership } from "@/lib/tenantAdmin";

type Role = "super_admin" | "company_owner" | "company_admin" | "finance_officer" | "staff_user";
const validRoles = new Set<Role>(["super_admin", "company_owner", "company_admin", "finance_officer", "staff_user"]);

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  authError: string | null;
  membershipError: string | null;
  companyId: string | null;
  memberships: ActiveCompanyMembership[];
  roles: Role[];
  isSuperAdmin: boolean;
  selectCompany: (companyId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: (forceReload?: boolean) => Promise<SessionUser | null>;
  refreshMembership: (preferredCompanyId?: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<ActiveCompanyMembership[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [roleRows, setRoleRows] = useState<{ role: string; companyId: string | null }[]>([]);
  const currentUid = useRef<string | null>(null);
  const selectedCompanyRef = useRef<string | null>(null);
  const membershipRequest = useRef(0);
  const sessionRequest = useRef(0);
  const loadedUid = useRef<string | null>(null);

  const loadMembership = useCallback(async (uid: string, preferredCompanyId?: string) => {
    const request = ++membershipRequest.current;
    setMembershipError(null);
    const [membershipResult, rolesResult] = await Promise.allSettled([
      loadActiveMemberships(uid),
      loadUserRoles(uid),
    ]);
    if (currentUid.current !== uid || request !== membershipRequest.current) return;

    const activeMemberships = membershipResult.status === "fulfilled" ? membershipResult.value : [];
    setMemberships(activeMemberships);
    setRoleRows(rolesResult.status === "fulfilled" ? rolesResult.value : []);
    const wantedCompanyId = preferredCompanyId ?? selectedCompanyRef.current;
    const activeCompanyId = activeMemberships.some(({ companyId }) => companyId === wantedCompanyId)
      ? wantedCompanyId
      : activeMemberships[0]?.companyId ?? null;
    selectedCompanyRef.current = activeCompanyId;
    setSelectedCompanyId(activeCompanyId);

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
      if (currentUid.current !== uid) {
        loadedUid.current = null;
        selectedCompanyRef.current = null;
        setSelectedCompanyId(null);
        setMemberships([]);
        setRoleRows([]);
      }
      currentUid.current = uid;
      setUser(currentUser);
      if (!uid) {
        loadedUid.current = null;
        ++membershipRequest.current;
        setMembershipError(null);
        selectedCompanyRef.current = null;
        setSelectedCompanyId(null);
        setMemberships([]);
        setRoleRows([]);
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
      setSelectedCompanyId(null);
      setMemberships([]);
      setRoleRows([]);

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
    try {
      await signOutFromSession();
    } finally {
      ++sessionRequest.current;
      ++membershipRequest.current;
      currentUid.current = null;
      loadedUid.current = null;
      selectedCompanyRef.current = null;
      setUser(null);
      setSelectedCompanyId(null);
      setMemberships([]);
      setRoleRows([]);
      setAuthError(null);
      setMembershipError(null);
      setLoading(false);
    }
  };

  const refreshMembership = async (preferredCompanyId?: string) => {
    const uid = currentUid.current;
    if (uid) await loadMembership(uid, preferredCompanyId);
  };

  const selectCompany = useCallback(async (nextCompanyId: string) => {
    const uid = currentUid.current;
    if (!uid) throw new Error("Sign in before selecting a company.");
    const request = ++membershipRequest.current;
    const [membershipResult, rolesResult] = await Promise.all([
      loadActiveMemberships(uid),
      loadUserRoles(uid),
    ]);
    if (currentUid.current !== uid || request !== membershipRequest.current) {
      throw new Error("Company access changed while the selection was being checked. Try again.");
    }
    if (!membershipResult.some(({ companyId }) => companyId === nextCompanyId)) {
      selectedCompanyRef.current = null;
      setSelectedCompanyId(null);
      setMemberships(membershipResult);
      setRoleRows(rolesResult);
      throw new Error("You do not have active access to that company.");
    }
    setMemberships(membershipResult);
    setRoleRows(rolesResult);
    selectedCompanyRef.current = nextCompanyId;
    setSelectedCompanyId(nextCompanyId);
  }, []);
  const companyId = memberships.some(({ companyId: id }) => id === selectedCompanyId)
    ? selectedCompanyId
    : null;
  const roles = useMemo(() => roleRows
    .filter((row) => validRoles.has(row.role as Role)
      && (row.role === "super_admin" ? row.companyId === null : row.companyId === companyId))
    .map((row) => row.role as Role), [roleRows, companyId]);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        authError,
        membershipError,
        companyId,
        memberships,
        roles,
        isSuperAdmin: roles.includes("super_admin"),
        selectCompany,
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