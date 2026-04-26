import { Download, Filter, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInvoices } from "@/hooks/useCompanyData";
import { formatNGN } from "@/lib/format";

export default function Reports() {
  const { data: invoices = [], isLoading } = useInvoices();

  // Last 6 months revenue trend (Confirmed/Signed only)
  const now = new Date();
  const months: string[] = [];
  const series: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString("en-GB", { month: "short" }));
    const total = invoices
      .filter((inv) => {
        const issue = new Date(inv.issue_date);
        return (
          ["Confirmed", "Signed"].includes(inv.status) &&
          issue.getFullYear() === d.getFullYear() &&
          issue.getMonth() === d.getMonth()
        );
      })
      .reduce((s, inv) => s + Number(inv.total), 0);
    series.push(total);
  }
  const max = Math.max(...series, 1);

  const byCustomer = invoices.reduce<Record<string, number>>((acc, i) => {
    acc[i.customer_name] = (acc[i.customer_name] ?? 0) + Number(i.total);
    return acc;
  }, {});
  const top = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = top[0]?.[1] ?? 1;

  // Status mix percentages
  const total = invoices.length || 1;
  const pct = (statuses: string[]) =>
    Math.round((invoices.filter((i) => statuses.includes(i.status)).length / total) * 100);

  // VAT summary (current month)
  const monthInvoices = invoices.filter((i) => {
    const issue = new Date(i.issue_date);
    return issue.getFullYear() === now.getFullYear() && issue.getMonth() === now.getMonth();
  });
  const taxableSales = monthInvoices.reduce((s, i) => s + Number(i.subtotal), 0);
  const vat = monthInvoices.reduce((s, i) => s + Number(i.tax), 0);

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

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : (
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
                    style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%` }}
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
            <Mix label="Confirmed" pct={pct(["Confirmed"])} tone="success" />
            <Mix label="Signed / Validated" pct={pct(["Signed", "Validated"])} tone="info" />
            <Mix label="Submitted" pct={pct(["Submitted", "Ready"])} tone="info" />
            <Mix label="In Review / Approved" pct={pct(["In Review", "Approved"])} tone="warning" />
            <Mix label="Draft" pct={pct(["Draft"])} tone="muted" />
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Top customers</h3>
          <p className="mb-4 text-xs text-muted-foreground">By invoiced amount</p>
          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No invoiced customers yet.</p>
          ) : (
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
          )}
        </Card>

        <Card className="p-5 shadow-elegant-sm">
          <h3 className="text-base font-semibold">Tax summary</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            VAT collected ({now.toLocaleString("en-GB", { month: "short" })})
          </p>
          <div className="space-y-3 text-sm">
            <Row label="Taxable sales" value={formatNGN(taxableSales)} />
            <Row label="VAT (7.5%)" value={formatNGN(vat)} bold />
            <Row label="Withholding tax" value={formatNGN(0)} />
            <div className="my-2 border-t border-border" />
            <Row label="Net remit" value={formatNGN(vat)} bold />
          </div>
        </Card>
      </div>
      )}
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
