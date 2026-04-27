import { useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { Activity, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { useAllInvoices } from "@/hooks/useCompanyData";
import { formatNumber } from "@/lib/format";

export default function AdminInvoiceTraffic() {
  const { data: invoices = [] } = useAllInvoices();

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return invoices.filter((i) => +new Date(i.created_at) >= cutoff);
  }, [invoices]);

  const submitted = last24h.filter((i) => ["Submitted", "Validated", "Signed", "Confirmed", "Rejected"].includes(i.status)).length;
  const validated = last24h.filter((i) => ["Validated", "Signed", "Confirmed"].includes(i.status)).length;
  const rejected = last24h.filter((i) => i.status === "Rejected").length;

  // Hourly buckets
  const hours = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"];
  const buckets = new Array(12).fill(0);
  last24h.forEach((i) => {
    const h = new Date(i.created_at).getHours();
    buckets[Math.floor(h / 2)]++;
  });
  const max = Math.max(...buckets, 1);

  // Top tenants
  const byCompany = new Map<string, number>();
  invoices.forEach((i) => byCompany.set(i.company_id, (byCompany.get(i.company_id) ?? 0) + 1));
  const top = [...byCompany.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMax = top[0]?.[1] ?? 1;

  return (
    <div>
      <PageHeader title="Invoice Traffic" description="Real-time submission throughput across tenants." />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Submitted (24h)" value={formatNumber(submitted)} icon={Send} />
          <StatCard label="Validated" value={formatNumber(validated)} icon={CheckCircle2} />
          <StatCard label="Rejected" value={String(rejected)} icon={AlertTriangle} />
          <StatCard label="Total invoices" value={formatNumber(invoices.length)} icon={Activity} />
        </div>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Hourly submissions</h3>
          <p className="mb-6 text-xs text-muted-foreground">Last 24 hours</p>
          <div className="flex h-56 items-end gap-2 px-2">
            {buckets.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-success/80" style={{ height: `${(v / max) * 100}%` }} title={String(v)} />
                </div>
                <span className="text-[10px] text-muted-foreground">{hours[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="mb-4 text-base font-semibold">Top tenants by volume</h3>
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No invoice activity yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {top.map(([companyId, n]) => (
                <div key={companyId} className="flex items-center gap-3">
                  <span className="w-48 truncate font-mono text-xs text-muted-foreground">{companyId.slice(0, 8)}…</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(n / topMax) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-medium tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
