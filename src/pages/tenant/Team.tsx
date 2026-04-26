import { Loader2, Mail, Plus, Search, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTeam } from "@/hooks/useCompanyData";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  finance_officer: "Finance Officer",
  staff_user: "Staff User",
};

const roleStyles: Record<string, string> = {
  super_admin: "bg-success/10 text-success",
  company_admin: "bg-primary/10 text-primary",
  finance_officer: "bg-info/10 text-info",
  staff_user: "bg-muted text-muted-foreground",
};

export default function Team() {
  const { data: members = [], isLoading } = useTeam();

  return (
    <div>
      <PageHeader
        title="Team"
        description="Manage users and their access roles."
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Email invitations coming soon", { description: "For now, ask new teammates to sign up directly." })}
          >
            <Plus className="h-4 w-4" />Invite member
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search team members" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm">All roles</Button>
          <Button variant="outline" size="sm">All status</Button>
        </Card>

        <Card className="shadow-elegant-sm">
          {isLoading ? (
            <div className="flex items-center justify-center px-6 py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading team…
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserCog className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold">No team members yet</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Last active</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {(m.display_name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{m.display_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={`${roleStyles[m.role]} hover:${roleStyles[m.role]}`} variant="secondary">
                        {roleLabels[m.role] ?? m.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className={
                        m.status === "Active" ? "bg-success/15 text-success hover:bg-success/15"
                        : m.status === "Invited" ? "bg-warning/15 text-warning hover:bg-warning/15"
                        : "bg-muted text-muted-foreground"
                      }>{m.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {m.last_active_at
                        ? new Date(m.last_active_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <Mail className="h-3.5 w-3.5" />Resend invite
                      </Button>
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
