import { Mail, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { team } from "@/mock/data";

const roleStyles: Record<string, string> = {
  "Company Admin": "bg-primary/10 text-primary",
  "Finance Officer": "bg-info/10 text-info",
  "Staff User": "bg-muted text-muted-foreground",
};

export default function Team() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="Manage users and their access roles."
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Invite member</Button>}
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
                {team.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={`${roleStyles[m.role]} hover:${roleStyles[m.role]}`} variant="secondary">{m.role}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className={
                        m.status === "Active" ? "bg-success/15 text-success hover:bg-success/15"
                        : m.status === "Invited" ? "bg-warning/15 text-warning hover:bg-warning/15"
                        : "bg-muted text-muted-foreground"
                      }>{m.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{m.lastActive}</td>
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
        </Card>
      </div>
    </div>
  );
}
