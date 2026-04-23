import { Activity, Building2, FileCheck2, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { adminMetrics, companies, integrationHealth } from "@/mock/data";
import { formatNumber } from "@/lib/format";

export default function AdminOverview() {
  return (
    <div>
      <PageHeader title="Platform Overview" description="Cross-tenant health & performance." />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active companies" value={String(adminMetrics.companies)} delta={{ value: "+2 this month", positive: true }} icon={Building2} />
          <StatCard label="Active users" value={formatNumber(adminMetrics.activeUsers)} delta={{ value: "+18", positive: true }} icon={Users} />
          <StatCard label="Invoices processed" value={formatNumber(adminMetrics.invoicesProcessed)} delta={{ value: "+9.2%", positive: true }} icon={FileCheck2} />
          <StatCard label="Submission success" value={`${adminMetrics.submissionSuccess}%`} delta={{ value: "+0.3%", positive: true }} icon={Activity} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5 shadow-elegant-sm">
            <h2 className="mb-4 text-base font-semibold">Recent companies</h2>
            <div className="space-y-3">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.industry} · {c.plan} plan · {c.users} users</p>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">{c.invoices.toLocaleString()} invoices</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 shadow-elegant-sm">
            <h2 className="mb-4 text-base font-semibold">Integrations</h2>
            <ul className="space-y-3 text-sm">
              {integrationHealth.slice(0, 5).map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted-foreground">{i.name}</span>
                  <StatusDot status={i.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const tone = status === "Operational" ? "bg-success" : status === "Degraded" ? "bg-warning" : "bg-info";
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      {status}
    </span>
  );
}
