import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ requireSuperAdmin = false }: { requireSuperAdmin?: boolean }) {
  const { user, loading, isSuperAdmin, companyId } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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