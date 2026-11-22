import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  Plus,
  Receipt,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices, INVOICE_STATUSES, type DBInvoiceStatus } from "@/hooks/useCompanyData";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusColors: Record<DBInvoiceStatus, string> = {
  Draft: "hsl(var(--muted-foreground))",
  "In Review": "hsl(var(--warning))",
  Approved: "hsl(var(--info))",
  Ready: "hsl(205 72% 44%)",
  Submitted: "hsl(220 78% 48%)",
  Validated: "hsl(var(--success))",
  Signed: "hsl(158 48% 28%)",
  Confirmed: "hsl(151 58% 40%)",
  Rejected: "hsl(var(--destructive))",
};

const activeWorkflowStatuses: DBInvoiceStatus[] = ["Submitted", "Validated", "Signed", "Approved", "Ready"];
const dueStatuses: DBInvoiceStatus[] = ["Submitted", "Validated", "Approved", "Ready"];

export default function Dashboard() {
  const { data: invoices = [], isLoading } = useInvoices();
  const today = new Date();
  const countBy = (status: DBInvoiceStatus) => invoices.filter((invoice) => invoice.status === status).length;
  const total = invoices.length;
  const rejected = countBy("Rejected");
  const confirmedValue = invoices
    .filter((invoice) => invoice.status === "Confirmed")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const activeValue = invoices
    .filter((invoice) => activeWorkflowStatuses.includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthCount = invoices.filter((invoice) => new Date(invoice.issue_date) >= monthStart).length;
  const statusData = INVOICE_STATUSES.map((status) => ({ status, count: countBy(status) }));
  const recent = invoices.slice(0, 6);
  const upcoming = [...invoices]
    .filter((invoice) => dueStatuses.includes(invoice.status))
    .sort((a, b) => +new Date(a.due_date) - +new Date(b.due_date))
    .slice(0, 5);
  const drafts = countBy("Draft");
  const awaitingUpdate = countBy("Submitted");
  const overdueCount = invoices.filter(
    (invoice) => dueStatuses.includes(invoice.status) && new Date(invoice.due_date) < startOfToday(today),
  ).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Here’s what’s happening across your business today."
        actions={(
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/app/invoices/new"><Plus className="h-4 w-4" />New invoice</Link>
          </Button>
        )}
      />

      <div className="space-y-6 p-6">
        <section aria-labelledby="financial-overview" className="space-y-3">
          <SectionHeading id="financial-overview" title="Financial overview" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Confirmed invoice value" value={formatNGN(confirmedValue)} icon={Banknote} hint="Invoices with Confirmed status" />
            <StatCard label="Value in active workflow" value={formatNGN(activeValue)} icon={Clock3} hint="Approved through submitted stages" />
            <StatCard label="Invoices this month" value={String(monthCount)} icon={Receipt} hint="By issue date" />
            <StatCard label="Rejected invoices" value={String(rejected)} icon={ShieldAlert} hint="Requires review" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)]">
          <Card className="min-w-0 p-5 shadow-elegant-sm sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Invoice workflow</h2>
                <p className="mt-1 text-xs text-muted-foreground">Distribution across every invoice status</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/invoices" className="gap-1 text-xs">All invoices <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            {isLoading ? <WorkflowSkeleton /> : (
              <div className="grid items-center gap-5 sm:grid-cols-[minmax(160px,0.75fr)_minmax(0,1fr)]">
                <div className="relative mx-auto h-48 w-full max-w-[220px]" role="img" aria-label={`Invoice status distribution, ${total} total invoices`}>
                  {total > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData.filter((item) => item.count > 0)} dataKey="count" nameKey="status" innerRadius="68%" outerRadius="92%" paddingAngle={2} stroke="none">
                            {statusData.filter((item) => item.count > 0).map((item) => <Cell key={item.status} fill={statusColors[item.status]} />)}
                          </Pie>
                          <Tooltip formatter={(value, _name, item) => [value, item.payload.status]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-semibold tabular-nums tracking-tight">{total}</span>
                        <span className="text-xs text-muted-foreground">invoices</span>
                      </div>
                    </>
                  ) : <div className="flex h-full items-center justify-center rounded-full border-8 border-muted text-center text-xs text-muted-foreground">No invoices yet</div>}
                </div>
                <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {statusData.map(({ status, count }) => {
                    const percentage = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <Link key={status} to={`/app/invoices?status=${encodeURIComponent(status)}`} className="group flex min-h-10 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${status}: ${count} invoices, ${percentage} percent`}>
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{status}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                        <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">{percentage}%</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 shadow-elegant-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <h2 className="text-base font-semibold">Action required</h2>
                <p className="text-xs text-muted-foreground">Items to review or move forward</p>
              </div>
            </div>
            {isLoading ? <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : (
              <div className="space-y-2">
                {rejected > 0 && <ActionItem to="/app/invoices?status=Rejected" label="Rejected invoices" detail="Review and resolve these invoices" count={rejected} tone="destructive" />}
                {overdueCount > 0 && <ActionItem to="/app/invoices" label="Overdue invoices" detail="Past due date and still in workflow" count={overdueCount} tone="warning" />}
                {awaitingUpdate > 0 && <ActionItem to="/app/invoices?status=Submitted" label="Awaiting status update" detail="Submitted invoices without a later status" count={awaitingUpdate} tone="info" />}
                {drafts > 0 && <ActionItem to="/app/invoices?status=Draft" label="Draft invoices" detail="Continue preparing these invoices" count={drafts} tone="neutral" />}
                {rejected === 0 && overdueCount === 0 && awaitingUpdate === 0 && drafts === 0 && (
                  <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border px-4 text-center">
                    <CheckCircle2 className="mb-2 h-5 w-5 text-success" />
                    <p className="text-sm font-medium">You’re all caught up</p>
                    <p className="mt-1 text-xs text-muted-foreground">No invoice actions need attention right now.</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)]">
          <Card className="p-5 shadow-elegant-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" /><h2 className="text-base font-semibold">Upcoming due</h2></div>
              <Button variant="ghost" size="sm" asChild><Link to="/app/invoices" className="gap-1 text-xs">All invoices <ArrowUpRight className="h-3.5 w-3.5" /></Link></Button>
            </div>
            {isLoading ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : upcoming.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No invoices due" description="Invoices in the selected workflow stages will appear here." />
            ) : (
              <div className="space-y-2">
                {upcoming.map((invoice) => <DueInvoice key={invoice.id} invoice={invoice} today={today} />)}
              </div>
            )}
          </Card>

          <Card className="p-5 shadow-elegant-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><h2 className="text-base font-semibold">Quick actions</h2></div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <QuickAction to="/app/invoices/new" icon={FilePlus2} title="Create invoice" primary />
              <QuickAction to="/app/customers/new" icon={UserPlus} title="Add customer" />
              <QuickAction to="/app/products/new" icon={Plus} title="Add product" />
              <QuickAction to="/app/reports" icon={FileText} title="Generate report" />
            </div>
          </Card>
        </section>

        <section aria-labelledby="recent-invoices">
          <Card className="overflow-hidden shadow-elegant-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div><h2 id="recent-invoices" className="text-base font-semibold">Recent invoices</h2><p className="mt-1 text-xs text-muted-foreground">Latest invoices by issue date</p></div>
              <Button variant="outline" size="sm" asChild><Link to="/app/invoices">View all</Link></Button>
            </div>
            {isLoading ? <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : recent.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices created yet" description="Create an invoice to see activity here." action={<Button asChild size="sm"><Link to="/app/invoices/new">New invoice</Link></Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr><th scope="col" className="px-5 py-3 text-left font-medium">Invoice</th><th scope="col" className="px-5 py-3 text-left font-medium">Customer</th><th scope="col" className="px-5 py-3 text-left font-medium">Issued</th><th scope="col" className="px-5 py-3 text-left font-medium">Due</th><th scope="col" className="px-5 py-3 text-left font-medium">Status</th><th scope="col" className="px-5 py-3 text-right font-medium">Amount</th><th scope="col" className="w-10 px-5 py-3" /></tr>
                  </thead>
                  <tbody>
                    {recent.map((invoice) => (
                      <tr key={invoice.id} className="group border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5"><Link to={`/app/invoices/${invoice.id}`} className="font-medium text-foreground hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{invoice.number}</Link>{invoice.irn && <p className="mt-0.5 max-w-40 truncate font-mono text-[10px] text-muted-foreground">{invoice.irn}</p>}</td>
                        <td className="max-w-52 truncate px-5 py-3.5 font-medium text-foreground">{invoice.customer_name}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-muted-foreground">{invoice.issue_date}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-muted-foreground">{invoice.due_date}</td>
                        <td className="px-5 py-3.5"><InvoiceStatusPill status={invoice.status} /></td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-foreground">{formatNGN(invoice.total)}</td>
                        <td className="px-5 py-3.5 text-right"><Link to={`/app/invoices/${invoice.id}`} aria-label={`View invoice ${invoice.number}`} className="inline-flex rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link></td>
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

function startOfToday(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return <h2 id={id} className="text-sm font-semibold tracking-wide text-muted-foreground">{title}</h2>;
}

function WorkflowSkeleton() {
  return <div className="grid items-center gap-5 sm:grid-cols-[minmax(160px,0.75fr)_minmax(0,1fr)]"><Skeleton className="mx-auto size-44 rounded-full" /><div className="grid gap-2 sm:grid-cols-2">{INVOICE_STATUSES.map((status) => <Skeleton key={status} className="h-9" />)}</div></div>;
}

function ActionItem({ to, label, detail, count, tone }: { to: string; label: string; detail: string; count: number; tone: "destructive" | "warning" | "info" | "neutral" }) {
  const toneClasses = { destructive: "text-destructive bg-destructive/10", warning: "text-warning bg-warning/10", info: "text-info bg-info/10", neutral: "text-muted-foreground bg-muted" };
  return (
    <Link to={to} className="group flex min-h-14 items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}><AlertTriangle className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block truncate text-xs text-muted-foreground">{detail}</span></span>
      <span className="text-sm font-semibold tabular-nums">{count}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function DueInvoice({ invoice, today }: { invoice: ReturnType<typeof useInvoices>["data"] extends (infer T)[] | undefined ? T : never; today: Date }) {
  const dueDate = new Date(invoice.due_date);
  const days = Math.floor((startOfToday(dueDate).getTime() - startOfToday(today).getTime()) / 86_400_000);
  const overdue = days < 0;
  const urgent = days >= 0 && days <= 7;
  return (
    <Link to={`/app/invoices/${invoice.id}`} className="flex min-h-16 items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className={cn("flex size-10 shrink-0 flex-col items-center justify-center rounded-md border text-center", overdue ? "border-destructive/30 bg-destructive/10 text-destructive" : urgent ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-muted text-muted-foreground")}>
        <span className="text-[9px] font-medium uppercase leading-none">{dueDate.toLocaleString("en-GB", { month: "short" })}</span><span className="text-sm font-semibold leading-tight">{dueDate.getDate()}</span>
      </div>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-medium">{invoice.number}</span><span className="hidden sm:inline-flex"><InvoiceStatusPill status={invoice.status} /></span></span><span className="block truncate text-xs text-muted-foreground">{invoice.customer_name}</span></span>
      <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums">{formatNGN(invoice.total)}</span><span className={cn("block text-[11px] font-medium", overdue ? "text-destructive" : urgent ? "text-warning" : "text-muted-foreground")}>{overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due in ${days}d`}</span></span>
    </Link>
  );
}

function InvoiceStatusPill({ status }: { status: DBInvoiceStatus }) {
  return <span className="inline-flex whitespace-nowrap rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">{status}</span>;
}

function QuickAction({ to, icon: Icon, title, primary = false }: { to: string; icon: typeof FileText; title: string; primary?: boolean }) {
  return (
    <Link to={to} className={cn("group flex min-h-12 items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", primary ? "border-primary/30 bg-primary/5" : "border-border")}>
      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md", primary ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span><span className="flex-1 text-sm font-medium">{title}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof FileText; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"><Icon className="h-5 w-5 text-muted-foreground" /><p className="text-sm font-semibold">{title}</p><p className="max-w-xs text-xs text-muted-foreground">{description}</p>{action}</div>;
}
