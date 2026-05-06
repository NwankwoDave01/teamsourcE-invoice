import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  Printer,
  Send,
  XCircle,
  FileJson,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useInvoice,
  useUpdateInvoiceStatus,
  useCustomer,
  useCurrentCompany,
  INVOICE_STATUSES,
  type DBInvoiceStatus,
} from "@/hooks/useCompanyData";
import { formatNGN, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NrsPayloadPreviewDialog } from "@/components/nrs/NrsPayloadPreviewDialog";
import { supabase } from "@/integrations/supabase/client";

const NEXT_STATUS: Partial<Record<DBInvoiceStatus, DBInvoiceStatus>> = {
  Draft: "In Review",
  "In Review": "Approved",
  Approved: "Ready",
  Ready: "Submitted",
  Submitted: "Validated",
  Validated: "Signed",
  Signed: "Confirmed",
};

const NEXT_LABEL: Partial<Record<DBInvoiceStatus, string>> = {
  Draft: "Submit for review",
  "In Review": "Approve",
  Approved: "Mark as ready",
  Ready: "Submit to NRS",
  Submitted: "Mark validated",
  Validated: "Mark signed",
  Signed: "Confirm",
};

export default function InvoiceDetails() {
  const { id } = useParams();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: customer } = useCustomer(invoice?.customer_id ?? undefined);
  const { data: company } = useCurrentCompany();
  const updateStatus = useUpdateInvoiceStatus();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-base font-semibold">Invoice not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted or you don't have access.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/app/invoices">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
      </div>
    );
  }

  const workflow = INVOICE_STATUSES.filter((s) => s !== "Rejected");
  const currentIdx = workflow.indexOf(invoice.status as (typeof workflow)[number]);
  const nextStatus = NEXT_STATUS[invoice.status];
  const nextLabel = NEXT_LABEL[invoice.status];

  const advance = async () => {
    if (!nextStatus) return;
    // When advancing from Ready, route through the NRS submit edge function (mock for now).
    if (invoice.status === "Ready") {
      try {
        setSubmitting(true);
        const { data, error } = await supabase.functions.invoke("nrs-submit", {
          body: { invoice_id: invoice.id },
        });
        if (error) throw error;
        if (data?.ok === false) {
          toast.error(data?.response?.message ?? "NRS submission rejected");
        } else {
          toast.success(`Submitted to NRS (mock). IRN: ${data?.irn ?? "—"}`);
        }
      } catch (e: any) {
        toast.error(e.message ?? "NRS submission failed");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: nextStatus });
      toast.success(`Invoice marked as ${nextStatus}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update status");
    }
  };

  const reject = async () => {
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: "Rejected" });
      toast.success("Invoice rejected");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update status");
    }
  };

  const lines = (invoice as any).lines ?? [];

  return (
    <div>
      <PageHeader
        title={invoice.number}
        description={`Issued to ${invoice.customer_name}`}
        breadcrumbs={[{ label: "Invoices" }, { label: invoice.number }]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/invoices">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="gap-1.5"
            >
              <FileJson className="h-4 w-4" />
              Preview NRS Payload
            </Button>
            {invoice.status !== "Confirmed" && invoice.status !== "Rejected" && nextStatus && (
              <Button size="sm" onClick={advance} disabled={updateStatus.isPending || submitting} className="gap-1.5">
                <Send className="h-4 w-4" />
                {nextLabel}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 shadow-elegant-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
                <h2 className="text-xl font-semibold">{invoice.number}</h2>
                <div className="mt-2"><StatusBadge status={invoice.status} /></div>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">NRS Reference</p>
                <p className="font-mono text-xs">{invoice.irn ?? "Not yet submitted"}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill from</p>
                <p className="mt-1 font-medium">{company?.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">TIN: {company?.tin ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill to</p>
                <p className="mt-1 font-medium">{invoice.customer_name}</p>
                {customer?.city && <p className="text-sm text-muted-foreground">{customer.city}</p>}
                {customer?.tin && <p className="text-sm text-muted-foreground">TIN: {customer.tin}</p>}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued</p>
                <p className="mt-1">{formatDate(invoice.issue_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="mt-1">{formatDate(invoice.due_date)}</p>
              </div>
            </div>

            {(() => {
              const inv = invoice as any;
              const hasNrs =
                inv.invoice_type ||
                inv.transaction_type ||
                inv.supply_date ||
                inv.payment_terms ||
                inv.payment_means_code;
              if (!hasNrs) return null;
              return (
                <div className="mt-6 grid gap-4 rounded-md border border-border bg-muted/20 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice type</p>
                    <p className="mt-1 text-sm">{inv.invoice_type ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction</p>
                    <p className="mt-1 text-sm">{inv.transaction_type ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Supply date</p>
                    <p className="mt-1 text-sm">{inv.supply_date ? formatDate(inv.supply_date) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment terms</p>
                    <p className="mt-1 text-sm">{inv.payment_terms ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment means</p>
                    <p className="mt-1 text-sm">{inv.payment_means_code ?? "—"}</p>
                  </div>
                  {inv.exchange_rate != null && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Exchange rate</p>
                      <p className="mt-1 text-sm tabular-nums">{inv.exchange_rate}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-6 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Description</th>
                    <th className="w-20 px-4 py-2.5 text-right font-medium">Qty</th>
                    <th className="w-32 px-4 py-2.5 text-right font-medium">Unit price</th>
                    <th className="w-32 px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3">{line.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{line.qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNGN(Number(line.unit_price))}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatNGN(Number(line.qty) * Number(line.unit_price))}
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatNGN(Number(invoice.subtotal))} />
              <Row label="VAT" value={formatNGN(Number(invoice.tax))} />
              <div className="my-2 border-t border-border" />
              <Row label="Total" value={formatNGN(Number(invoice.total))} bold />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 shadow-elegant-sm">
            <h3 className="text-base font-semibold">Compliance workflow</h3>
            <p className="mb-4 text-xs text-muted-foreground">Draft → Confirmed</p>
            <ol className="space-y-3">
              {workflow.map((s, i) => {
                const done = i <= currentIdx;
                const current = i === currentIdx;
                return (
                  <li key={s} className="flex items-start gap-3">
                    {done ? (
                      <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", current ? "text-primary" : "text-success")} />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <div>
                      <p className={cn("text-sm", done ? "font-medium text-foreground" : "text-muted-foreground")}>{s}</p>
                      {current && <p className="text-xs text-muted-foreground">Current stage</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {invoice.status !== "Confirmed" && invoice.status !== "Rejected" && (
              <Button
                variant="outline"
                size="sm"
                onClick={reject}
                disabled={updateStatus.isPending}
                className="mt-5 w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <XCircle className="h-3.5 w-3.5" />
                Mark as rejected
              </Button>
            )}
          </Card>

          {invoice.notes && (
            <Card className="p-5 shadow-elegant-sm">
              <h3 className="text-base font-semibold">Notes</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{invoice.notes}</p>
            </Card>
          )}
        </div>
      </div>

      <NrsPayloadPreviewDialog
        invoiceId={invoice.id}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-base font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
