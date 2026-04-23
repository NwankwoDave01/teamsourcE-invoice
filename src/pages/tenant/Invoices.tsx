import { Download, Filter, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { invoices, INVOICE_STATUSES } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Invoices() {
  const [filter, setFilter] = useState<string>("All");
  const counts = INVOICE_STATUSES.map((s) => ({ s, n: invoices.filter((i) => i.status === s).length }));
  const filtered = filter === "All" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="All invoices across the compliance pipeline."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Export</Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/invoices/new"><Plus className="h-4 w-4" />New invoice</Link>
            </Button>
          </>
        }
      />
      <div className="space-y-4 p-6">
        <Card className="p-3 shadow-elegant-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label={`All (${invoices.length})`} active={filter === "All"} onClick={() => setFilter("All")} />
            {counts.map(({ s, n }) => (
              <FilterChip key={s} label={`${s} (${n})`} active={filter === s} onClick={() => setFilter(s)} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoice number, customer, IRN…" className="h-9 pl-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Date range</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Customer</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Amount</Button>
          </div>
        </Card>

        <Card className="shadow-elegant-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Invoice</th>
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Issue date</th>
                  <th className="px-5 py-3 text-left font-medium">Due</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">NRS Ref</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <Link to={`/app/invoices/${inv.id}`} className="font-medium text-foreground hover:text-primary">{inv.number}</Link>
                      <div className="text-xs text-muted-foreground">by {inv.createdBy}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.customerName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.issueDate}</td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.dueDate}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">{formatNGN(inv.total)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{inv.irn ?? "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {invoices.length}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled>Previous</Button>
              <Button variant="ghost" size="sm">Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
