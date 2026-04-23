import { Bell, ChevronDown, HelpCircle, Search, ShieldCheck, Building2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { currentCompany, companies } from "@/mock/data";

export function TopBar({ variant = "tenant" }: { variant?: "tenant" | "admin" }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = variant === "admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-6" />

      {/* Workspace switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2 text-sm font-medium">
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <Building2 className="h-4 w-4 text-primary" />
            )}
            <span className="max-w-[140px] truncate">
              {isAdmin ? "Platform Console" : currentCompany.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Companies</DropdownMenuLabel>
          {companies.slice(0, 4).map((c) => (
            <DropdownMenuItem key={c.id} onClick={() => navigate("/app/dashboard")}>
              <Building2 className="mr-2 h-4 w-4 text-primary" />
              <div className="flex flex-1 flex-col">
                <span className="text-sm">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.plan} • {c.tin}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate("/app/dashboard")}>
            <Building2 className="mr-2 h-4 w-4" /> Tenant workspace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/overview")}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Super Admin console
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="relative ml-2 hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={isAdmin ? "Search companies, users, logs…" : "Search invoices, customers, products…"}
          className="h-9 pl-9 bg-background"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4.5 w-4.5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">AO</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left leading-tight md:flex">
                <span className="text-xs font-medium">Adaeze Okafor</span>
                <span className="text-[10px] text-muted-foreground">{isAdmin ? "Super Admin" : "Company Admin"}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/app/settings")}>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
