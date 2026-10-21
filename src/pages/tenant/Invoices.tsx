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
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvoices,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  useCurrentCompany,
  INVOICE_STATUSES,
  type DBInvoiceStatus,
} from "@/hooks/useCompanyData";
import { toast } from "sonner";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNrsSubmit } from "@/hooks/useNrsSubmit";
import { useAuth } from "@/contexts/AuthContext";
import { useNrsSubmissionHistory } from "@/hooks/useNrsSubmissionHistory";
import { hasDeviceAttempt, submissionBlockReason } from "@/lib/nrs/submissionSafety";
import { SubmissionBadge } from "@/components/shared/SubmissionBadge";
import { generateInvoicesCsv, downloadCsv } from "@/lib/csvExport";
import { downloadInvoicePdf } from "@/lib/pdfExport";
import { PrintableInvoice, type PrintableInvoiceData } from "@/components/shared/PrintableInvoice";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 15;

const DRAFT_REVERTIBLE_STATUSES: readonly DBInvoiceStatus[] = [
  "In Review",
  "Approved",
  "Ready",
];

function canRevertToDraft(status: string): boolean {
  return DRAFT_REVERTIBLE_STATUSES.includes(status as DBInvoiceStatus);
}

const statusDot: Record<DBInvoiceStatus, string> = {
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
  const { data: invoices = [], isLoading } = useInvoices();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteMut = useDeleteInvoice();
  const submitToNrs = useNrsSubmit();
  let user: any = null;
  let companyId: string | null = null;
  let roles: string[] = [];
  let isSuperAdmin = false;
  try {
    const auth = useAuth();
    user = auth.user;
    companyId = auth.companyId;
    roles = (auth.roles as string[]) ?? [];
    isSuperAdmin = auth.isSuperAdmin ?? false;
  } catch {
    // Graceful fallback when rendered without AuthProvider
  }
  const isStaff = roles.includes("staff_user") && !roles.includes("company_admin") && !roles.includes("finance_officer") && !isSuperAdmin;
  const canManage = isSuperAdmin || roles.includes("company_admin") || roles.includes("finance_officer") || (!isStaff && roles.length === 0);
  const history = useNrsSubmissionHistory();
  const blockReason = (inv: (typeof invoices)[number]) => {
    if (!canManage) return "Staff users cannot submit invoices to NRS.";
    return submissionBlockReason(
      inv,
      companyId,
      history.isSuccess && !history.isFetching ? history.data : undefined,
      hasDeviceAttempt(user?.id, companyId, inv.id),
    );
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");

  // Validate status URL parameter against known statuses
  const filter: "All" | DBInvoiceStatus = useMemo(() => {
    if (rawStatus && (INVOICE_STATUSES as readonly string[]).includes(rawStatus)) {
      return rawStatus as DBInvoiceStatus;
    }
    return "All";
  }, [rawStatus]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submittingToApp, setSubmittingToApp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBulkDraft, setConfirmBulkDraft] = useState(false);
  const [draftTarget, setDraftTarget] = useState<(typeof invoices)[number] | null>(null);
  const { data: currentCompany } = useCurrentCompany();
  const [invoicesToPrint, setInvoicesToPrint] = useState<PrintableInvoiceData[] | null>(null);

  // Reset to page 1 whenever filter or search query changes
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const setFilter = (nextStatus: "All" | DBInvoiceStatus) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextStatus === "All") {
        next.delete("status");
      } else {
        next.set("status", nextStatus);
      }
      return next;
    });
  };

  const counts = useMemo(
    () => INVOICE_STATUSES.map((s) => ({ s, n: invoices.filter((i) => i.status === s).length })),
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (filter !== "All" && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.number.toLowerCase().includes(q) ||
        i.customer_name.toLowerCase().includes(q) ||
        (i.irn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [filter, search, invoices]);

  // Client-side pagination calculations
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalFiltered);

  const paginatedInvoices = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex],
  );

  const allOnPageSelected =
    paginatedInvoices.length > 0 && paginatedInvoices.every((i) => selected.has(i.id));
  const someOnPageSelected =
    paginatedInvoices.some((i) => selected.has(i.id)) && !allOnPageSelected;

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paginatedInvoices.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paginatedInvoices.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("status");
      return next;
    });
    setSearch("");
  };
  const hasActiveFilters = filter !== "All" || search.trim().length > 0;

  // CSV Export handlers
  const handleExportFiltered = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filterSuffix = filter !== "All" ? `-${filter.toLowerCase().replace(/\s+/g, "-")}` : "";
    const filename = `invoices${filterSuffix}-${dateStr}.csv`;
    const csv = generateInvoicesCsv(filtered);
    downloadCsv(csv, filename);
    if (filtered.length === 0) {
      toast.info("Exported empty CSV template (0 matching invoices)");
    } else {
      toast.success(`Exported ${filtered.length} invoice${filtered.length === 1 ? "" : "s"} to CSV`);
    }
  };

  const handleExportSelected = () => {
    const selectedInvoices = invoices.filter((i) => selected.has(i.id));
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `selected-invoices-${dateStr}.csv`;
    const csv = generateInvoicesCsv(selectedInvoices);
    downloadCsv(csv, filename);
    if (selectedInvoices.length === 0) {
      toast.info("Exported empty CSV template (0 selected invoices)");
    } else {
      toast.success(
        `Exported ${selectedInvoices.length} selected invoice${selectedInvoices.length === 1 ? "" : "s"} to CSV`,
      );
    }
  };

  const handlePrintSingle = async (inv: (typeof invoices)[number]) => {
    let lines: any[] = [];
    try {
      const { data: dbLines } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("position");
      if (dbLines) lines = dbLines;
    } catch {
      // fallback without lines
    }
    setInvoicesToPrint([{ ...inv, lines }]);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 100);
  };

  const handleBulkPrint = async () => {
    const selectedInvoices = invoices.filter((i) => selected.has(i.id));
    if (selectedInvoices.length === 0) {
      toast.error("No invoices selected to print");
      return;
    }
    const ids = selectedInvoices.map((i) => i.id);
    let linesByInvoice: Record<string, any[]> = {};
    try {
      const { data: dbLines } = await supabase
        .from("invoice_lines")
        .select("*")
        .in("invoice_id", ids)
        .order("position");
      if (dbLines) {
        for (const line of dbLines) {
          if (!linesByInvoice[line.invoice_id]) linesByInvoice[line.invoice_id] = [];
          linesByInvoice[line.invoice_id].push(line);
        }
      }
    } catch {
      // fallback without lines
    }
    const prepared: PrintableInvoiceData[] = selectedInvoices.map((inv) => ({
      ...inv,
      lines: linesByInvoice[inv.id] || [],
    }));
    setInvoicesToPrint(prepared);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 100);
  };

  const handleDownloadPdfSingle = async (inv: (typeof invoices)[number]) => {
    let lines: any[] = [];
    try {
      const { data: dbLines } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("position");
      if (dbLines) lines = dbLines;
    } catch {
      // fallback
    }
    downloadInvoicePdf({ ...inv, lines }, currentCompany);
    toast.success(`Downloaded PDF for ${inv.number}`);
  };

  // Draft reversion handlers
  const eligibleForDraft = useMemo(
    () => invoices.filter((i) => selected.has(i.id) && canRevertToDraft(i.status)),
    [invoices, selected],
  );

  const handleConfirmSingleDraft = async () => {
    if (!draftTarget) return;
    if (!canManage) {
      toast.error("Staff users cannot elevate or change invoice status.");
      setDraftTarget(null);
      return;
    }
    try {
      await updateStatus.mutateAsync({ id: draftTarget.id, status: "Draft" });
      toast.success(`${draftTarget.number} marked as Draft`);
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to mark invoice as Draft", { description: err.message });
    } finally {
      setDraftTarget(null);
    }
  };

  const handleConfirmBulkDraft = async () => {
    if (!canManage) {
      toast.error("Staff users cannot elevate or change invoice status.");
      return;
    }
    try {
      await Promise.all(
        eligibleForDraft.map((inv) => updateStatus.mutateAsync({ id: inv.id, status: "Draft" })),
      );
      toast.success(
        `Marked ${eligibleForDraft.length} invoice${eligibleForDraft.length === 1 ? "" : "s"} as Draft`,
      );
      setSelected(new Set());
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to update status", { description: err.message });
    } finally {
      setConfirmBulkDraft(false);
    }
  };

  const submitRowToApp = async (id: string) => {
    if (!canManage) {
      toast.error("Staff users cannot submit invoices to NRS.");
      return;
    }
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const blocked = blockReason(inv);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    setSubmittingToApp(true);
    try {
      const res = await submitToNrs(id);
      if (res.kind === "success") toast.success(`${inv.number}: ${res.message}`);
      else if (res.kind === "rejected") {
        toast.error(`${inv.number}: ${res.message}`, { description: res.details ?? undefined });
      } else {
        toast.warning(`${inv.number}: ${res.message}`, { description: res.details ?? undefined });
      }
    } finally {
      setSubmittingToApp(false);
    }
  };

  const bulkSubmit = async () => {
    if (!canManage) {
      toast.error("Staff users cannot submit invoices to NRS.");
      return;
    }
    const ids = Array.from(selected);
    const eligible = ids.filter((id) => {
      const inv = invoices.find((i) => i.id === id);
      return inv && !blockReason(inv);
    });
    const skipped = ids.length - eligible.length;
    if (eligible.length === 0) {
      toast.error('No selected invoices are at "Ready" with a confirmed prior state');
      return;
    }
    setSubmittingToApp(true);
    let success = 0,
      rejected = 0,
      unconfirmed = 0;
    try {
      // Sequential on purpose: stop the batch on the first unconfirmed outcome.
      for (const id of eligible) {
        const res = await submitToNrs(id);
        if (res.kind === "success") success++;
        else {
          if (res.kind === "rejected") rejected++;
          else unconfirmed++;
          if (res.kind === "unconfirmed") break;
        }
      }
      const notRun = eligible.length - success - rejected - unconfirmed;
      if (success > 0)
        toast.success(`${success} invoice${success === 1 ? "" : "s"} validated and signed (NRS sandbox)`);
      if (rejected > 0) toast.error(`${rejected} rejected — open each invoice for details`);
      if (unconfirmed > 0)
        toast.warning(
          `1 result unconfirmed — batch stopped. ${notRun} not sent. Do not resubmit until status is reviewed.`,
        );
      if (skipped > 0) toast.message(`Skipped ${skipped} not eligible`);
      setSelected(new Set());
    } finally {
      setSubmittingToApp(false);
    }
  };

  const performBulkDelete = async () => {
    if (!canManage) {
      toast.error("Staff users cannot delete invoices.");
      return;
    }
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => deleteMut.mutateAsync(id)));
      toast.success(`Deleted ${ids.length} invoice${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message ?? "Failed to delete invoices");
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      <div className="print-only">
        {invoicesToPrint && invoicesToPrint.length > 0 && (
          <PrintableInvoice invoices={invoicesToPrint} company={currentCompany} />
        )}
      </div>

      <div className="screen-only">
        <PageHeader
        title="Invoices"
        description="All invoices across the compliance pipeline."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportFiltered}
            >
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
        <p className="text-xs text-muted-foreground">
          Current path: direct NRS sandbox validation and signing. APP handoff is not live. Recorded
          attempts require review; the backend remains the final retry safeguard.
        </p>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={bulkSubmit}
                  disabled={
                    !canManage ||
                    submittingToApp ||
                    !invoices.some((inv) => selected.has(inv.id) && !blockReason(inv))
                  }
                >
                  <Send className="h-3.5 w-3.5" />
                  Validate & sign (NRS sandbox)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExportSelected}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleBulkPrint}
                >
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
                    {selected.size === 1 ? (
                      <DropdownMenuItem asChild>
                        <Link to={`/app/invoices/new?duplicate=${Array.from(selected)[0]}`}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled title="Select a single invoice to duplicate">
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      disabled={!canManage || eligibleForDraft.length === 0 || updateStatus.isPending}
                      onSelect={(e) => {
                        e.preventDefault();
                        setConfirmBulkDraft(true);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Mark as Draft ({eligibleForDraft.length})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canManage}
                      onClick={() => setConfirmDelete(true)}
                      className="text-destructive focus:text-destructive"
                    >
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
                        checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-medium">Invoice</th>
                    <th className="px-3 py-3 text-left font-medium">Customer</th>
                    <th className="px-3 py-3 text-left font-medium">Issue date</th>
                    <th className="px-3 py-3 text-left font-medium">Due</th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 text-left font-medium">IRN</th>
                    <th className="px-3 py-3 text-left font-medium">Status</th>
                    <th className="w-12 px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((inv) => {
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
                        </td>
                        <td className="px-3 py-4">
                          <div className="font-medium text-foreground">{inv.customer_name}</div>
                        </td>
                        <td className="px-3 py-4 tabular-nums text-muted-foreground">{inv.issue_date}</td>
                        <td className="px-3 py-4 tabular-nums text-muted-foreground">{inv.due_date}</td>
                        <td className="px-3 py-4 text-right tabular-nums font-semibold text-foreground">
                          {formatNGN(inv.total)}
                        </td>
                        <td className="px-3 py-4 font-mono text-xs text-muted-foreground">{inv.irn ?? "—"}</td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge status={inv.status} />
                            <SubmissionBadge
                              status={(inv as { submission_status?: string | null }).submission_status}
                              showUnknown
                            />
                          </div>
                          {inv.status === "Ready" && blockReason(inv) && (
                            <p className="mt-1 max-w-56 text-xs text-muted-foreground">{blockReason(inv)}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <RowActions
                            invoice={inv}
                            canManage={canManage}
                            canSubmit={canManage && !blockReason(inv)}
                            submitting={submittingToApp}
                            updatingStatus={updateStatus.isPending}
                            onSubmitApp={() => submitRowToApp(inv.id)}
                            onMarkDraft={() => setDraftTarget(inv)}
                            onPrint={() => handlePrintSingle(inv)}
                            onDownloadPdf={() => handleDownloadPdfSingle(inv)}
                          />
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
                Showing <span className="font-medium text-foreground">{totalFiltered === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="font-medium text-foreground">{endIndex}</span> of{" "}
                <span className="font-medium text-foreground">{totalFiltered}</span> invoices
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} invoice{selected.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected invoice{selected.size === 1 ? "" : "s"} and{" "}
              {selected.size === 1 ? "its" : "their"} line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Mark as Draft confirmation dialog */}
      <AlertDialog open={confirmBulkDraft} onOpenChange={setConfirmBulkDraft}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {eligibleForDraft.length} invoice{eligibleForDraft.length === 1 ? "" : "s"} as Draft?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will return {eligibleForDraft.length} eligible pre-submission invoice
              {eligibleForDraft.length === 1 ? "" : "s"} to Draft status.
              {selected.size > eligibleForDraft.length && (
                <span className="mt-2 block text-muted-foreground">
                  {selected.size - eligibleForDraft.length} selected invoice
                  {selected.size - eligibleForDraft.length === 1 ? " was" : "s were"} skipped because
                  only pre-submission invoices (In Review, Approved, Ready) can be returned to Draft.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDraft}
              disabled={updateStatus.isPending}
            >
              Mark as Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single invoice Mark as Draft confirmation dialog */}
      <AlertDialog open={!!draftTarget} onOpenChange={(open) => !open && setDraftTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {draftTarget?.number} as Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will return invoice {draftTarget?.number} to Draft status. Any pre-submission approvals
              will need to be repeated before submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSingleDraft}
              disabled={updateStatus.isPending}
            >
              Mark as Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function RowActions({
  invoice,
  canManage = true,
  canSubmit,
  submitting,
  updatingStatus,
  onSubmitApp,
  onMarkDraft,
  onPrint,
  onDownloadPdf,
}: {
  invoice: { id: string; number: string; status: DBInvoiceStatus };
  canManage?: boolean;
  canSubmit: boolean;
  submitting: boolean;
  updatingStatus: boolean;
  onSubmitApp: () => void;
  onMarkDraft: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
}) {
  const eligibleDraft = canRevertToDraft(invoice.status);
  const isProtected = [
    "Submitted",
    "Validated",
    "Signed",
    "Confirmed",
    "Rejected",
  ].includes(invoice.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${invoice.number}`}
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
          <Link to={`/app/invoices/${invoice.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            View details
          </Link>
        </DropdownMenuItem>
        {isProtected ? (
          <DropdownMenuItem
            disabled
            title="Protected compliance stage. Invoices that have entered external verification cannot be edited."
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : !canManage && invoice.status !== "Draft" ? (
          <DropdownMenuItem
            disabled
            title="Staff users can only edit draft invoices."
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to={`/app/invoices/${invoice.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to={`/app/invoices/new?duplicate=${invoice.id}`}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canManage || !eligibleDraft || updatingStatus}
          onSelect={(e) => {
            e.preventDefault();
            onMarkDraft();
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Mark as Draft
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canManage || !canSubmit || submitting}
          onSelect={(e) => {
            e.preventDefault();
            onSubmitApp();
          }}
        >
          <Send className="mr-2 h-4 w-4" />
          Validate & sign (NRS sandbox)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onDownloadPdf();
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onPrint();
          }}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled
          className="text-muted-foreground cursor-not-allowed opacity-50"
          title="Voiding is unsupported by the current status model. FIRS compliance requires Credit Note (381) issuance or cancellation submission to NRS."
        >
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
          {hasFilters ? "No invoices match your filters" : "No invoices created yet"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters or search terms to find what you're looking for."
            : "Click 'New Invoice' to get started."}
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
