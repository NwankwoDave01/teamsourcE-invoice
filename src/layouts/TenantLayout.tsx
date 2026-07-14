import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/shell/TenantSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import CompanyOnboarding from "@/pages/tenant/onboarding/CompanyOnboarding";
import { Loader2 } from "lucide-react";

export default function TenantLayout() {
  const { loading, user, companyId, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && !companyId && !isSuperAdmin) {
    return <CompanyOnboarding />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <TenantSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar variant="tenant" />
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
