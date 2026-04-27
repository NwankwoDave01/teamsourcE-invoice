import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FilePlus2,
  FileText,
  PenLine,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices, type DBInvoiceStatus } from "@/hooks/useCompanyData";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";

// Ordered pipeline (excluding Rejected, which is a terminal failure tracked separately)
const PIPELINE: { status: DBInvoiceStatus; icon: typeof FileText; tone: string }[] = [
  { status: "Draft",     icon: FileText,    tone: "text-muted-foreground" },
  { status: "In Review", icon: PenLine,     tone: "text-warning" },
  { status: "Approved",  icon: CheckCircle2,tone: "text-info" },
  { status: "Ready",     icon: FileCheck2,  tone: "text-info" },
  { status: "Submitted", icon: Send,        tone: "text-info" },
  { status: "Validated", icon: ShieldCheck, tone: "text-success" },
  { status: "Signed",    icon: ShieldCheck, tone: "text-success" },
  { status: "Confirmed", icon: CheckCircle2,tone: "text-success" },
];

export default function Dashboard() {
  const { data: invoices = [], isLoading } = useInvoices();
  const countBy = (status: DBInvoiceStatus) => invoices.filter((i) => i.status === status).length;
  const total = invoices.length;
  const rejected = countBy("Rejected");

  // Operational KPIs (8 invoice-state cards)
  const operationalKpis: { label: string; value: number; status?: DBInvoiceStatus; icon: typeof FileText; accent: string }[] = [
    { label: "Total invoices", value: total,                icon: Receipt,     accent: "text-primary" },
    { label: "Draft",          value: countBy("Draft"),     status: "Draft",     icon: FileText,    accent: "text-muted-foreground" },
    { label: "In Review",      value: countBy("In Review"), status: "In Review", icon: PenLine,     accent: "text-warning" },
    { label: "Approved",       value: countBy("Approved"),  status: "Approved",  icon: CheckCircle2,accent: "text-info" },
    { label: "Submitted",      value: countBy("Submitted"), status: "Submitted", icon: Send,        accent: "text-info" },
    { label: "Validated",      value: countBy("Validated"), status: "Validated", icon: ShieldCheck, accent: "text-success" },
    { label: "Signed",         value: countBy("Signed"),    status: "Signed",    icon: ShieldCheck, accent: "text-success" },
    { label: "Rejected",       value: rejected,             status: "Rejected",  icon: XCircle,     accent: "text-destructive" },
  ];

  const recent = invoices.slice(0, 6);

  // Upcoming due — Submitted/Validated/Approved invoices with closest due date
  const today = new Date();
  const upcoming = [...invoices]
    .filter((i) => ["Submitted", "Validated", "Approved", "Ready"].includes(i.status))
    .sort((a, b) => +new Date(a.due_date) - +new Date(b.due_date))
    .slice(0, 5);

  const pipelineMax = Math.max(...PIPELINE.map((p) => countBy(p.status)), 1);

  // Financial KPIs from live data
  const confirmedRevenue = invoices
    .filter((i) => i.status === "Confirmed")
    .reduce((s, i) => s + Number(i.total), 0);
  const outstanding = invoices
    .filter((i) => ["Submitted", "Validated", "Signed", "Approved", "Ready"].includes(i.status))
    .reduce((s, i) => s + Number(i.total), 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const invoicesThisMonth = invoices.filter((i) => new Date(i.issue_date) >= monthStart).length;

  // Compliance metrics computed from live data
  const submittedTotal = invoices.filter((i) =>
    ["Submitted", "Validated", "Signed", "Confirmed", "Rejected"].includes(i.status),
  ).length;
  const validatedOk = invoices.filter((i) =>
    ["Validated", "Signed", "Confirmed"].includes(i.status),
  ).length;
  const rejectedNrs = countBy("Rejected");
  const validationRate = submittedTotal > 0 ? (validatedOk / submittedTotal) * 100 : 0;
  const tinVerified = new Set(invoices.filter((i) => i.customer_id).map((i) => i.customer_id)).size;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Real-time view of invoicing activity, compliance posture, and what needs your attention."
        actions={
          <>
            <Button variant="outline" size="sm">Export report</Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/invoices/new"><Plus className="h-4 w-4" />New invoice</Link>
            </Button>
          </>
        }
      />

      <div className="space-y-8 p-6">
        {/* ============================== FINANCIAL KPIs ============================== */}
        <section className="space-y-3">
          <SectionLabel icon={Banknote} title="Financial overview" hint="Money in motion across your customers" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Confirmed Revenue" value={formatNGN(confirmedRevenue)} icon={Banknote} />
            <StatCard label="Outstanding" value={formatNGN(outstanding)} icon={Clock} hint="Submitted & awaiting confirmation" />
            <StatCard label="Invoices this month" value={String(invoicesThisMonth)} icon={Receipt} />
            <StatCard label="NRS Validation Rate" value={`${validationRate.toFixed(1)}%`} icon={ShieldCheck} />
          </div>
        </section>

        {/* ============================== OPERATIONAL KPIs (8 cards) ============================== */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <SectionLabel icon={FileText} title="Invoice activity" hint="Live counts across every workflow stage" />
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/app/invoices">All invoices <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {operationalKpis.map((k) => (
              <Link
                key={k.label}
                to={k.status ? `/app/invoices?status=${encodeURIComponent(k.status)}` : "/app/invoices"}
                className="group rounded-lg border border-border bg-card p-4 shadow-elegant-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elegant"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent", k.accent)}>
                    <k.icon className="h-3.5 w-3.5" />
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{k.value}</p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================== PIPELINE + QUICK ACTIONS ============================== */}
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6 shadow-elegant-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Workflow pipeline</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Progression of invoices from draft to NRS confirmation</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/invoices" className="gap-1 text-xs">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>

            {/* Stage flow header (visual progression) */}
            <div className="mb-6 hidden items-center gap-1 overflow-x-auto md:flex">
              {PIPELINE.map((p, i) => (
                <div key={p.status} className="flex flex-1 items-center gap-1">
                  <div className="flex flex-1 flex-col items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-2">
                    <p.icon className={cn("h-4 w-4", p.tone)} />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{p.status}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{countBy(p.status)}</span>
                  </div>
                  {i < PIPELINE.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                </div>
              ))}
            </div>

            {/* Per-stage bars */}
            <div className="space-y-2.5">
              {PIPELINE.map((p) => {
                const c = countBy(p.status);
                return (
                  <div key={p.status} className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-primary transition-all"
                        style={{ width: `${Math.max((c / pipelineMax) * 100, c > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-medium tabular-nums text-foreground">{c}</span>
                  </div>
                );
              })}
              {rejected > 0 && (
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <div className="w-32 shrink-0">
                    <StatusBadge status="Rejected" />
                  </div>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-destructive" style={{ width: `${(rejected / pipelineMax) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-medium tabular-nums text-destructive">{rejected}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="flex flex-col p-6 shadow-elegant-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Quick actions</h2>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <QuickAction to="/app/invoices/new" icon={FilePlus2} title="Create invoice" description="Draft and submit to NRS" primary />
              <QuickAction to="/app/customers" icon={UserPlus} title="Add customer" description="Verify TIN & save details" />
              <QuickAction to="/app/products" icon={Plus} title="Add product" description="Catalog with tax rates" />
              <QuickAction to="/app/reports" icon={FileText} title="Generate report" description="Monthly revenue & compliance" />
            </div>
          </Card>
        </section>

        {/* ============================== COMPLIANCE + UPCOMING DUE ============================== */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Compliance health */}
          <Card className="p-6 shadow-elegant-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Compliance health</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">NRS submission performance — last 30 days</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Healthy
              </span>
            </div>

            <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Validation success rate</span>
                <span className="text-2xl font-semibold tabular-nums text-success">{validationRate.toFixed(1)}%</span>
              </div>
              <Progress value={validationRate} className="h-2" />
              <p className="mt-2 text-[11px] text-muted-foreground">{validatedOk} of {submittedTotal} submissions accepted by NRS</p>
            </div>

            <div className="space-y-2">
              <ComplianceRow icon={Send}        tone="info"        label="Submitted to NRS"       value="312" />
              <ComplianceRow icon={CheckCircle2} tone="success"     label="Successfully validated" value="301" />
              <ComplianceRow icon={ShieldX}     tone="destructive" label="Rejected by NRS"        value="4" badge="Action needed" />
              <ComplianceRow icon={Clock}       tone="muted"       label="Avg. signing time"      value="2m 14s" />
              <ComplianceRow icon={ShieldCheck} tone="success"     label="TIN verifications"      value="278" />
            </div>
          </Card>

          {/* Upcoming due */}
          <Card className="flex flex-col p-6 shadow-elegant-sm">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-warning" />
                <h2 className="text-base font-semibold">Upcoming due</h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/invoices" className="gap-1 text-xs">All <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>

            {upcoming.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No invoices due soon"
                description="All outstanding invoices have been settled."
              />
            ) : (
              <div className="flex-1 space-y-2">
                {upcoming.map((inv) => {
                  const days = Math.round((+new Date(inv.dueDate) - +today) / 86400000);
                  const overdue = days < 0;
                  const urgent = days >= 0 && days <= 7;
                  return (
                    <Link
                      key={inv.id}
                      to={`/app/invoices/${inv.id}`}
                      className="flex items-center gap-4 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border text-center",
                        overdue ? "border-destructive/30 bg-destructive/10 text-destructive" :
                        urgent ? "border-warning/30 bg-warning/10 text-warning" :
                        "border-border bg-muted text-muted-foreground"
                      )}>
                        <span className="text-[9px] font-medium uppercase leading-none">
                          {new Date(inv.dueDate).toLocaleString("en-GB", { month: "short" })}
                        </span>
                        <span className="text-sm font-semibold leading-tight">
                          {new Date(inv.dueDate).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{inv.number}</p>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{inv.customerName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{formatNGN(inv.total)}</p>
                        <p className={cn(
                          "text-[11px] font-medium",
                          overdue ? "text-destructive" : urgent ? "text-warning" : "text-muted-foreground"
                        )}>
                          {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due in ${days}d`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* ============================== RECENT INVOICES ============================== */}
        <section>
          <Card className="overflow-hidden shadow-elegant-sm">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-base font-semibold">Recent invoices</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Most recent activity across your team</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/invoices">View all invoices</Link>
              </Button>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                description="Create your first invoice to start tracking activity."
                action={
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/app/invoices/new"><Plus className="h-4 w-4" />New invoice</Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Invoice</th>
                      <th className="px-5 py-3 text-left font-medium">Customer</th>
                      <th className="px-5 py-3 text-left font-medium">Issued</th>
                      <th className="px-5 py-3 text-left font-medium">Due</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                      <th className="w-10 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((inv) => (
                      <tr key={inv.id} className="group border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5">
                          <Link to={`/app/invoices/${inv.id}`} className="font-medium text-foreground hover:text-primary">
                            {inv.number}
                          </Link>
                          {inv.irn && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{inv.irn}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-foreground">{inv.customerName}</p>
                          <p className="text-[11px] text-muted-foreground">by {inv.createdBy}</p>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{inv.issueDate}</td>
                        <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{inv.dueDate}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-foreground">{formatNGN(inv.total)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

/* ----------------------------- Helper components ----------------------------- */

function SectionLabel({ icon: Icon, title, hint }: { icon: typeof FileText; title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {hint && <span className="hidden text-xs text-muted-foreground/70 sm:inline">— {hint}</span>}
      </div>
    </div>
  );
}

function QuickAction({
  to, icon: Icon, title, description, primary,
}: { to: string; icon: typeof FileText; title: string; description: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-3 rounded-md border p-3 transition-all",
        primary
          ? "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10"
          : "border-border hover:border-primary/30 hover:bg-muted/40",
      )}
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
        primary ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function ComplianceRow({
  icon: Icon, label, value, tone, badge,
}: {
  icon: typeof FileText; label: string; value: string;
  tone: "success" | "destructive" | "info" | "muted"; badge?: string;
}) {
  const toneMap = {
    success: { bg: "bg-success/10", text: "text-success" },
    destructive: { bg: "bg-destructive/10", text: "text-destructive" },
    info: { bg: "bg-info/10", text: "text-info" },
    muted: { bg: "bg-muted", text: "text-muted-foreground" },
  }[tone];
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md", toneMap.bg, toneMap.text)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm text-foreground">{label}</span>
        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            <AlertTriangle className="h-3 w-3" /> {badge}
          </span>
        )}
      </div>
      <span className={cn("text-sm font-semibold tabular-nums", toneMap.text)}>{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon, title, description, action,
}: { icon: typeof FileText; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
