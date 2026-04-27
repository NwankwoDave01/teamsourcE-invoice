import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllPlatformUsers } from "@/hooks/useCompanyData";

const statusStyle: Record<string, string> = {
  Active: "bg-success/15 text-success",
  Invited: "bg-warning/15 text-warning",
  Disabled: "bg-muted text-muted-foreground",
};

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  finance_officer: "Finance Officer",
  staff_user: "Staff",
};

export default function AdminUsers() {
  const { data: users = [], isLoading } = useAllPlatformUsers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.company.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Global directory across all tenants."
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Invite user</Button>}
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across all companies"
              className="h-9 pl-9"
            />
          </div>
        </Card>
        <Card className="shadow-elegant-sm">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">User</th>
                    <th className="px-5 py-3 text-left font-medium">Company</th>
                    <th className="px-5 py-3 text-left font-medium">Role</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-xs">
                              {u.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{u.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.company}</td>
                      <td className="px-5 py-3"><Badge variant="secondary">{roleLabel[u.role] ?? u.role}</Badge></td>
                      <td className="px-5 py-3">
                        <Badge variant="secondary" className={statusStyle[u.status] ?? ""}>{u.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
