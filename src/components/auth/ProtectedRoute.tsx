import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ requireSuperAdmin = false }: { requireSuperAdmin?: boolean }) {
  const {
    user,
    loading,
    authError,
    membershipError,
    refreshSession,
    refreshMembership,
    isSuperAdmin,
    companyId,
  } = useAuth();
  const location = useLocation();

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p role="alert" className="text-sm text-destructive">{authError}</p>
        <button className="text-sm underline" onClick={() => void refreshSession()}>Retry session check</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && membershipError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p role="alert" className="text-sm text-destructive">{membershipError}</p>
        <button className="text-sm underline" onClick={() => void refreshMembership()}>Retry company access check</button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to={companyId ? "/app/dashboard" : "/auth/login"} replace />;
  }

  if (!requireSuperAdmin && !companyId && !isSuperAdmin) {
    return <Navigate to="/auth/login" state={{ reason: "no_active_membership" }} replace />;
  }

  return <Outlet />;
}