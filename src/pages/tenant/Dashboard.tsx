import { ArrowUpRight, Banknote, Clock, FileCheck2, Plus, Receipt, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { invoices, tenantMetrics, INVOICE_STATUSES } from "@/mock/data";
import { formatNGN } from "@/lib/format";

export default function Dashboard() {
  const recent = invoices.slice(0, 6);
  const funnel = INVOICE_STATUSES.map((s) => ({
    status: s,
    count: invoices.filter((i) => i.status === s).length,
  })).filter((f) => f.count > 0);
  const max = Math.max(...funnel.map((f) => f.count));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of invoicing activity and compliance status."
        actions={
          <>
            <Button variant="outline" size="sm">Export report</Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/invoices/new"><Plus className="h-4 w-4" />New invoice</Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Confirmed Revenue" value={formatNGN(tenantMetrics.totalRevenue)} delta={{ value: "+12.4%", positive: true }} icon={Banknote} />
          <StatCard label="Outstanding" value={formatNGN(tenantMetrics.outstanding)} delta={{ value: "-3.1%", positive: true }} icon={Clock} hint="Submitted & awaiting confirmation" />
          <StatCard label="Invoices this month" value={String(tenantMetrics.invoicesThisMonth)} delta={{ value: "+8 invoices", positive: true }} icon={Receipt} />
          <StatCard label="NRS Validation Rate" value={`${tenantMetrics.validationRate}%`} delta={{ value: "+0.6%", positive: true }} icon={ShieldCheck} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5 shadow-elegant-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Workflow pipeline</h2>
                <p className="text-xs text-muted-foreground">Invoice distribution across compliance stages</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/invoices" className="gap-1 text-xs">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            <div className="space-y-3">
              {funnel.map((f) => (
                <div key={f.status} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <StatusBadge status={f.status} />
                  </div>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${(f.count / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-medium tabular-nums">{f.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 shadow-elegant-sm">
            <h2 className="text-base font-semibold">Compliance health</h2>
            <p className="mb-4 text-xs text-muted-foreground">Last 30 days</p>
            <div className="space-y-4">
              <Row label="Submitted to NRS" value="312" />
              <Row label="Successfully validated" value="301" tone="success" />
              <Row label="Rejected by NRS" value="4" tone="destructive" />
              <Row label="Avg. signing time" value="2m 14s" />
              <Row label="TIN verifications" value="278" />
            </div>
          </Card>
        </div>

        <Card className="shadow-elegant-sm">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="text-base font-semibold">Recent invoices</h2>
              <p className="text-xs text-muted-foreground">Most recent activity across your team</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/invoices">View all invoices</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Invoice</th>
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Issued</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">
                      <Link to={`/app/invoices/${inv.id}`} className="hover:text-primary">{inv.number}</Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.customerName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.issueDate}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">{formatNGN(inv.total)}</td>
                    <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
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

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
