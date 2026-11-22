import {
  LayoutDashboard, Building2, Users, Activity, Plug, Terminal, Settings, ChevronsLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/BrandMark";

const items = [
  { title: "Overview", url: "/admin/overview", icon: LayoutDashboard },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Invoice Traffic", url: "/admin/invoice-traffic", icon: Activity },
  { title: "Integration Health", url: "/admin/integration-health", icon: Plug },
  { title: "System Logs", url: "/admin/system-logs", icon: Terminal },
  { title: "Platform Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-5 group-data-[collapsible=icon]:px-2">
        <Link to="/admin/overview" className="flex items-center">
          <BrandMark variant="admin" size="sm" showText={!collapsed} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-2 py-4 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                      <NavLink
                        to={item.url}
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <Button
          type="button" variant="ghost"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebar}
          className="flex h-9 w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronsLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>Collapse sidebar</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
