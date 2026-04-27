import { Activity, Building2, FileCheck2, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAllCompanies,
  useAllPlatformUsers,
  useAllInvoices,
  useIntegrationHealth,
} from "@/hooks/useCompanyData";
import { formatNumber } from "@/lib/format";

export default function AdminOverview() {
  const { data: companies = [], isLoading: companiesLoading } = useAllCompanies();
  const { data: users = [] } = useAllPlatformUsers();
  const { data: invoices = [] } = useAllInvoices();
  const { data: integrations = [] } = useIntegrationHealth();

  const submitted = invoices.filter((i) =>
    ["Submitted", "Validated", "Signed", "Confirmed", "Rejected"].includes(i.status),
  ).length;
  const validated = invoices.filter((i) =>
    ["Validated", "Signed", "Confirmed"].includes(i.status),
  ).length;
  const successRate = submitted > 0 ? ((validated / submitted) * 100).toFixed(1) : "—";

  return (
    <div>
      <PageHeader title="Platform Overview" description="Cross-tenant health & performance." />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active companies" value={String(companies.length)} icon={Building2} />
          <StatCard label="Active users" value={formatNumber(users.length)} icon={Users} />
          <StatCard label="Invoices processed" value={formatNumber(invoices.length)} icon={FileCheck2} />
          <StatCard label="Submission success" value={`${successRate}${successRate !== "—" ? "%" : ""}`} icon={Activity} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 shadow-elegant-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold">Recent companies</h2>
            {companiesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : companies.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No companies yet.</p>
            ) : (
              <div className="space-y-3">
                {companies.slice(0, 6).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.industry ?? "—"} · {c.plan} plan · {c.company_members?.[0]?.count ?? 0} users
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {(c.invoices?.[0]?.count ?? 0).toLocaleString()} invoices
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5 shadow-elegant-sm">
            <h2 className="mb-4 text-base font-semibold">Integrations</h2>
            {integrations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No integrations configured.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {integrations.slice(0, 5).map((i) => (
                  <li key={i.name} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{i.name}</span>
                    <StatusDot status={i.status} />
                  </li>
                ))}
              </ul>
            )}
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
