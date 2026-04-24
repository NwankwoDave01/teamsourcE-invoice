import {
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { invoices, INVOICE_STATUSES, type InvoiceStatus } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusDot: Record<InvoiceStatus, string> = {
  Draft: "bg-muted-foreground/60",
  "In Review": "bg-warning",
  Approved: "bg-info",
  Ready: "bg-info",
  Submitted: "bg-info",
  Validated: "bg-success",
  Signed: "bg-success",
  Confirmed: "bg-success",
  Rejected: "bg-destructive",
};

export default function Invoices() {
  const [filter, setFilter] = useState<"All" | InvoiceStatus>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(
    () => INVOICE_STATUSES.map((s) => ({ s, n: invoices.filter((i) => i.status === s).length })),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (filter !== "All" && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.number.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        (i.irn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [filter, search]);

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setFilter("All");
    setSearch("");
  };
  const hasActiveFilters = filter !== "All" || search.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="All invoices across the compliance pipeline."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/invoices/new">
                <Plus className="h-4 w-4" />
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        {/* ============================== FILTERS ============================== */}
        <Card className="overflow-hidden shadow-elegant-sm">
          {/* Status pill row */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-muted/20 px-3 py-2.5">
            <StatusPill
              label="All"
              count={invoices.length}
              active={filter === "All"}
              onClick={() => setFilter("All")}
            />
            <span className="h-5 w-px shrink-0 bg-border" />
            {counts.map(({ s, n }) => (
              <StatusPill
                key={s}
                label={s}
                count={n}
                dotClass={statusDot[s]}
                active={filter === s}
                onClick={() => setFilter(s)}
              />
            ))}
          </div>

          {/* Search + filter buttons */}
          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice number, customer, IRN…"
                className="h-9 pl-9 pr-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <FilterButton icon={CalendarRange} label="Date range" />
            <FilterButton icon={Users} label="Customer" />
            <FilterButton icon={Wallet} label="Amount" />

            <div className="ml-auto flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                More
              </Button>
            </div>
          </div>
        </Card>

        {/* ============================== TABLE ============================== */}
        <Card className="overflow-hidden shadow-elegant-sm">
          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {selected.size} selected
                </span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Submit to NRS
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      More
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      Mark as Draft
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-5 py-3 text-left">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-medium">Invoice</th>
                    <th className="px-3 py-3 text-left font-medium">Customer</th>
                    <th className="px-3 py-3 text-left font-medium">Issue date</th>
                    <th className="px-3 py-3 text-left font-medium">Due</th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 text-left font-medium">NRS Ref</th>
                    <th className="px-3 py-3 text-left font-medium">Status</th>
                    <th className="w-12 px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const isSelected = selected.has(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={cn(
                          "group border-b border-border transition-colors last:border-0",
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30",
                        )}
                      >
                        <td className="px-5 py-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(inv.id)}
                            aria-label={`Select ${inv.number}`}
                          />
                        </td>
                        <td className="px-3 py-4">
                          <Link
                            to={`/app/invoices/${inv.id}`}
                            className="font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {inv.number}
                          </Link>
                          <div className="mt-0.5 text-xs text-muted-foreground">by {inv.createdBy}</div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="font-medium text-foreground">{inv.customerName}</div>
                        </td>
                        <td className="px-3 py-4 tabular-nums text-muted-foreground">{inv.issueDate}</td>
                        <td className="px-3 py-4 tabular-nums text-muted-foreground">{inv.dueDate}</td>
                        <td className="px-3 py-4 text-right tabular-nums font-semibold text-foreground">
                          {formatNGN(inv.total)}
                        </td>
                        <td className="px-3 py-4 font-mono text-xs text-muted-foreground">{inv.irn ?? "—"}</td>
                        <td className="px-3 py-4">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <RowActions invoiceId={inv.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <span>
                Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                <span className="font-medium text-foreground">{invoices.length}</span> invoices
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="ghost" size="sm">
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ----------------------------- Helper components ----------------------------- */

function StatusPill({
  label,
  count,
  active,
  dotClass,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  dotClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
      )}
    >
      {dotClass && <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />}
      <span>{label}</span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FilterButton({ icon: Icon, label }: { icon: typeof Filter; label: string }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5 border-dashed">
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </Button>
  );
}

function RowActions({ invoiceId }: { invoiceId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to={`/app/invoices/${invoiceId}`}>
            <FileText className="mr-2 h-4 w-4" />
            View details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Send className="mr-2 h-4 w-4" />
          Submit to NRS
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <XCircle className="mr-2 h-4 w-4" />
          Void invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="relative">
        <div className="absolute inset-0 -m-3 rounded-full bg-primary/5 blur-xl" />
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-elegant-sm">
          <Receipt className="h-6 w-6" />
        </span>
      </div>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">
          {hasFilters ? "No invoices match your filters" : "No invoices yet"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters or search terms to find what you're looking for."
            : "Create your first invoice to start tracking activity through the compliance pipeline."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {hasFilters ? (
          <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        ) : (
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/app/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
