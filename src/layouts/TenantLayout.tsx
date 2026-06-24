import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/shell/TenantSidebar";
import { TopBar } from "@/components/shell/TopBar";

export default function TenantLayout() {

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
