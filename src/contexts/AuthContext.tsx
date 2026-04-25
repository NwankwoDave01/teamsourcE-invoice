import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  const loadMembership = async (uid: string) => {
    const { data: member } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", uid)
      .eq("status", "Active")
      .maybeSingle();
    setCompanyId(member?.company_id ?? null);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    setRoles((roleRows ?? []).map((r) => r.role as Role));
  };

  useEffect(() => {
    // 1. Subscribe to auth changes BEFORE getSession (per Lovable Cloud guidance)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => loadMembership(sess.user.id), 0);
      } else {
        setCompanyId(null);
        setRoles([]);
      }
    });

    // 2. Then get current session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadMembership(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshMembership = async () => {
    if (user) await loadMembership(user.id);
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