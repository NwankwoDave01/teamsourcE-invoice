import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllCompanies } from "@/hooks/useCompanyData";
import { formatNumber } from "@/lib/format";

const statusStyle: Record<string, string> = {
  Active: "bg-success/15 text-success",
  Trial: "bg-warning/15 text-warning",
  Suspended: "bg-destructive/10 text-destructive",
};

export default function AdminCompanies() {
  const { data: companies = [], isLoading } = useAllCompanies();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c: any) =>
        c.name.toLowerCase().includes(q) ||
        c.tin?.toLowerCase().includes(q),
    );
  }, [companies, search]);

  return (
    <div>
      <PageHeader
        title="Companies"
        description="All tenants on the platform."
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add company</Button>}
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or TIN"
              className="h-9 pl-9"
            />
          </div>
        </Card>
        <Card className="shadow-elegant-sm">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No companies found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Company</th>
                    <th className="px-5 py-3 text-left font-medium">TIN</th>
                    <th className="px-5 py-3 text-left font-medium">Industry</th>
                    <th className="px-5 py-3 text-left font-medium">Plan</th>
                    <th className="px-5 py-3 text-right font-medium">Users</th>
                    <th className="px-5 py-3 text-right font-medium">Invoices</th>
                    <th className="px-5 py-3 text-left font-medium">Joined</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">{c.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.tin}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.industry ?? "—"}</td>
                      <td className="px-5 py-3"><Badge variant="secondary">{c.plan}</Badge></td>
                      <td className="px-5 py-3 text-right tabular-nums">{c.company_members?.[0]?.count ?? 0}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatNumber(c.invoices?.[0]?.count ?? 0)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <Badge variant="secondary" className={statusStyle[c.status] ?? ""}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
