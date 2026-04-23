import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { Activity, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { formatNumber } from "@/lib/format";

export default function AdminInvoiceTraffic() {
  const hours = ["00","02","04","06","08","10","12","14","16","18","20","22"];
  const submissions = [12, 8, 6, 18, 84, 142, 188, 220, 196, 152, 88, 34];
  const max = Math.max(...submissions);

  return (
    <div>
      <PageHeader title="Invoice Traffic" description="Real-time submission throughput across tenants." />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Submitted (24h)" value={formatNumber(1248)} delta={{ value: "+11.3%", positive: true }} icon={Send} />
          <StatCard label="Validated" value={formatNumber(1219)} delta={{ value: "+10.8%", positive: true }} icon={CheckCircle2} />
          <StatCard label="Rejected" value="29" delta={{ value: "-12%", positive: true }} icon={AlertTriangle} />
          <StatCard label="Avg latency" value="412ms" delta={{ value: "-8ms", positive: true }} icon={Activity} />
        </div>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Hourly submissions</h3>
          <p className="mb-6 text-xs text-muted-foreground">Today (UTC+1)</p>
          <div className="flex h-56 items-end gap-2 px-2">
            {submissions.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-success/80 hover:opacity-90" style={{ height: `${(v / max) * 100}%` }} title={String(v)} />
                </div>
                <span className="text-[10px] text-muted-foreground">{hours[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="mb-4 text-base font-semibold">Top tenants by volume</h3>
          <div className="space-y-3 text-sm">
            {[
              { name: "Bluewave Logistics", n: 412 },
              { name: "Lagos MedSupply", n: 287 },
              { name: "Sahara Foods Ltd", n: 219 },
              { name: "Kano Textiles Co.", n: 142 },
              { name: "Greenfield Agro", n: 88 },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-48 truncate text-foreground">{r.name}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(r.n / 412) * 100}%` }} />
                </div>
                <span className="w-16 text-right tabular-nums font-medium">{r.n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
