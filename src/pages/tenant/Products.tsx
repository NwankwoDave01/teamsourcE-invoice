import { Filter, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { products } from "@/mock/data";
import { formatNGN } from "@/lib/format";

export default function Products() {
  return (
    <div>
      <PageHeader
        title="Products & Services"
        description="Catalog of items and services you sell."
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add item</Button>}
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by SKU or name" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Category</Button>
          <Button variant="outline" size="sm">Active only</Button>
        </Card>

        <Card className="shadow-elegant-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">SKU</th>
                  <th className="px-5 py-3 text-left font-medium">Item</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Unit</th>
                  <th className="px-5 py-3 text-right font-medium">Unit price</th>
                  <th className="px-5 py-3 text-right font-medium">Tax</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.unit}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatNGN(p.price)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{p.taxRate}%</td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className={p.active ? "bg-success/15 text-success hover:bg-success/15" : ""}>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
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
