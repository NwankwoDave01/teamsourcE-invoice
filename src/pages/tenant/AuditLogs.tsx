import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { auditLogs } from "@/mock/data";

const catColor: Record<string, string> = {
  Invoice: "bg-info/10 text-info",
  Customer: "bg-primary/10 text-primary",
  Product: "bg-warning/10 text-warning",
  User: "bg-success/10 text-success",
  Settings: "bg-muted text-muted-foreground",
  Auth: "bg-destructive/10 text-destructive",
};

export default function AuditLogs() {
  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="A tamper-evident record of all activity in this workspace."
        actions={<Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Export CSV</Button>}
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by actor, action, target…" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm">Category</Button>
          <Button variant="outline" size="sm">Date range</Button>
          <Button variant="outline" size="sm">Actor</Button>
        </Card>

        <Card className="shadow-elegant-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-5 py-3 text-left font-medium">Actor</th>
                  <th className="px-5 py-3 text-left font-medium">Action</th>
                  <th className="px-5 py-3 text-left font-medium">Target</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{l.timestamp}</td>
                    <td className="px-5 py-3 font-medium">{l.actor}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.action}</td>
                    <td className="px-5 py-3 font-mono text-xs">{l.target}</td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className={`${catColor[l.category]} hover:${catColor[l.category]}`}>{l.category}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{l.ip}</td>
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
