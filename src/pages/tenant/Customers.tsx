import { Filter, Plus, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { customers } from "@/mock/data";
import { formatNGN } from "@/lib/format";

export default function Customers() {
  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage the businesses you invoice."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Upload className="h-4 w-4" />Import</Button>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add customer</Button>
          </>
        }
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, TIN, or email" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Status</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />City</Button>
          <Button variant="outline" size="sm">Outstanding only</Button>
        </Card>

        <Card className="shadow-elegant-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">TIN</th>
                  <th className="px-5 py-3 text-left font-medium">City</th>
                  <th className="px-5 py-3 text-right font-medium">Invoices</th>
                  <th className="px-5 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email} · {c.phone}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.tin}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.city}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.invoices}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">{formatNGN(c.outstanding)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={c.status === "Active" ? "default" : "secondary"} className={c.status === "Active" ? "bg-success/15 text-success hover:bg-success/15" : ""}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>Showing 1–{customers.length} of {customers.length}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled>Previous</Button>
              <Button variant="ghost" size="sm" disabled>Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
