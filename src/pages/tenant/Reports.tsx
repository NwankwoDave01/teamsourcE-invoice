import { Download, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invoices } from "@/mock/data";
import { formatNGN } from "@/lib/format";

export default function Reports() {
  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const series = [4_200_000, 5_100_000, 4_800_000, 6_300_000, 7_900_000, 9_400_000];
  const max = Math.max(...series);
  const byCustomer = invoices.reduce<Record<string, number>>((acc, i) => {
    acc[i.customerName] = (acc[i.customerName] ?? 0) + i.total;
    return acc;
  }, {});
  const top = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = top[0][1];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Business performance and compliance analytics."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Last 6 months</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Revenue trend</h3>
          <p className="mb-6 text-xs text-muted-foreground">Confirmed invoices, monthly</p>
          <div className="flex h-56 items-end gap-4 px-2">
            {series.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-primary transition-all hover:opacity-90"
                    style={{ height: `${(v / max) * 100}%` }}
                    title={formatNGN(v)}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{months[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Status mix</h3>
          <p className="mb-4 text-xs text-muted-foreground">Current pipeline</p>
          <div className="space-y-3 text-sm">
            <Mix label="Confirmed" pct={42} tone="success" />
            <Mix label="Signed / Validated" pct={28} tone="info" />
            <Mix label="Submitted" pct={12} tone="info" />
            <Mix label="In Review / Approved" pct={14} tone="warning" />
            <Mix label="Draft" pct={4} tone="muted" />
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Top customers</h3>
          <p className="mb-4 text-xs text-muted-foreground">By invoiced amount</p>
          <div className="space-y-3">
            {top.map(([name, amt]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm">{name}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(amt / topMax) * 100}%` }} />
                </div>
                <span className="w-32 text-right text-sm tabular-nums font-medium">{formatNGN(amt)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Tax summary</h3>
          <p className="mb-4 text-xs text-muted-foreground">VAT collected (Oct)</p>
          <div className="space-y-3 text-sm">
            <Row label="Taxable sales" value={formatNGN(48_200_000)} />
            <Row label="VAT (7.5%)" value={formatNGN(3_615_000)} bold />
            <Row label="Withholding tax" value={formatNGN(942_000)} />
            <div className="my-2 border-t border-border" />
            <Row label="Net remit" value={formatNGN(2_673_000)} bold />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Mix({ label, pct, tone }: { label: string; pct: number; tone: "success" | "info" | "warning" | "muted" }) {
  const color = { success: "bg-success", info: "bg-info", warning: "bg-warning", muted: "bg-muted-foreground/40" }[tone];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
