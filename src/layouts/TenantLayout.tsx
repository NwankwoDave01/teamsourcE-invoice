import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/shell/TenantSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { seedDemoData } from "@/hooks/useCompanyData";

export default function TenantLayout() {
  const { user, companyId } = useAuth();

  useEffect(() => {
    if (user && companyId) {
      // Seed demo data once per workspace (idempotent: skips if customers exist)
      seedDemoData(companyId, user.id).catch((e) => console.error("Seed failed:", e));
    }
  }, [user, companyId]);

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
