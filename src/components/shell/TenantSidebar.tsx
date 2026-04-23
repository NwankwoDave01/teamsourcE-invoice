import {
  LayoutDashboard, Users, Package, FileText, FilePlus2,
  BarChart3, UserCog, Settings, ScrollText, ShieldCheck, ChevronsLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Customers", url: "/app/customers", icon: Users },
  { title: "Products", url: "/app/products", icon: Package },
];

const invoicing = [
  { title: "Invoices", url: "/app/invoices", icon: FileText },
  { title: "Create Invoice", url: "/app/invoices/new", icon: FilePlus2 },
  { title: "Reports", url: "/app/reports", icon: BarChart3 },
];

const admin = [
  { title: "Team", url: "/app/team", icon: UserCog },
  { title: "Settings", url: "/app/settings", icon: Settings },
  { title: "Audit Logs", url: "/app/audit-logs", icon: ScrollText },
];

export function TenantSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const renderItems = (items: typeof main) => (
    <SidebarMenu>
      {items.map((item) => {
        const active = pathname === item.url || (item.url !== "/app/invoices" && pathname.startsWith(item.url + "/"));
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
              <NavLink
                to={item.url}
                end={item.url === "/app/invoices"}
                className="flex items-center gap-3 rounded-md text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
        <Link to="/app/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary shadow-elegant-md">
            <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-primary-foreground">Vexa</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">E-Invoicing Suite</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(main)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Invoicing</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(invoicing)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Administration</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(admin)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronsLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
