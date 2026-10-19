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
import { useNrsSubmit } from "@/hooks/useNrsSubmit";
import { useAuth } from "@/contexts/AuthContext";
import { useNrsSubmissionHistory } from "@/hooks/useNrsSubmissionHistory";
import { hasDeviceAttempt, submissionBlockReason } from "@/lib/nrs/submissionSafety";
import type { SubmitResult } from "@/lib/nrs/submitContract";
import { SubmissionBadge, submissionLabel } from "@/components/shared/SubmissionBadge";
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

const NEXT_STATUS: Partial<Record<DBInvoiceStatus, DBInvoiceStatus>> = {
  Draft: "In Review",
  "In Review": "Approved",
  Approved: "Ready",
};

const NEXT_LABEL: Partial<Record<DBInvoiceStatus, string>> = {
  Draft: "Submit for review",
  "In Review": "Approve",
  Approved: "Mark as ready",
  Ready: "Validate & sign (NRS sandbox)",
};

export default function InvoiceDetails() {
  const { id } = useParams();
  const { data: invoice, isLoading, refetch: refetchInvoice } = useInvoice(id);
  const { data: customer } = useCustomer(invoice?.customer_id ?? undefined);
  const { data: company } = useCurrentCompany();
  const updateStatus = useUpdateInvoiceStatus();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitResult | null>(null);
  const submitToNrs = useNrsSubmit();
  const { user, companyId } = useAuth();
  const history = useNrsSubmissionHistory();
  const [confirmReject, setConfirmReject] = useState(false);

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

  const workflow = INVOICE_STATUSES.filter((s) => ["Draft", "In Review", "Approved", "Ready"].includes(s));
  const currentIdx = workflow.indexOf(invoice.status as (typeof workflow)[number]);
  const nextStatus = NEXT_STATUS[invoice.status];
  const nextLabel = NEXT_LABEL[invoice.status];
  const blocked = submissionBlockReason(invoice, companyId, history.isSuccess && !history.isFetching ? history.data : undefined, hasDeviceAttempt(user?.id, companyId, invoice.id));

  const advance = async () => {
    if (invoice.status === "Ready") {
      if (blocked) { toast.error(blocked); return; }
      setSubmitting(true);
      try {
        const res = await submitToNrs(invoice.id);
        setLastResult(res);
        await refetchInvoice();
        if (res.kind === "success") toast.success(res.message);
        else if (res.kind === "rejected") toast.error(res.message, { description: res.details ?? undefined });
        else toast.warning(res.message, { description: res.details ?? undefined });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: nextStatus });
      toast.success(`Invoice marked as ${nextStatus}`);
    } catch (e: unknown) {
      toast.error("Failed to update status", { description: (e as Error).message });
    }
  };

  const performReject = async () => {
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: "Rejected" });
      toast.success("Invoice rejected");
    } catch (e: unknown) {
      toast.error("Failed to update status", { description: (e as Error).message });
    } finally {
      setConfirmReject(false);
    }
  };

  const lines = invoice.lines ?? [];
  const persistedInvoice = invoice as typeof invoice & {
    qr_code?: string | null;
    qr_code_data?: string | null;
    csid?: string | null;
  };
  const qrImageSource = resolveQrImageSource(persistedInvoice.qr_code, persistedInvoice.qr_code_data);
  const hasPersistedQrField = Boolean(persistedInvoice.qr_code ?? persistedInvoice.qr_code_data);
  const csid = typeof persistedInvoice.csid === "string" && persistedInvoice.csid.trim() ? persistedInvoice.csid.trim() : null;

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
            {invoice.status !== "Confirmed" && invoice.status !== "Rejected" && (nextStatus || invoice.status === "Ready") && (
              <Button size="sm" onClick={advance} disabled={updateStatus.isPending || submitting || (invoice.status === "Ready" && Boolean(blocked))} className="gap-1.5">
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
                <div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={invoice.status} /><SubmissionBadge status={(invoice as { submission_status?: string | null }).submission_status} showUnknown /></div>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">IRN</p>
                <p className="font-mono text-xs">{invoice.irn ?? "Not yet assigned"}</p>
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

            {invoice.status === "Ready" && blocked && <p role="alert" className="mt-4 text-sm text-warning">{blocked} Backend safeguards remain authoritative across devices.</p>}
            {lastResult && lastResult.kind !== "success" && (
              <div role="alert" className={cn("mt-6 rounded-md border p-4 text-sm", lastResult.kind === "rejected" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5")}>
                <p className="font-medium">{lastResult.kind === "rejected" ? "Rejected" : "Result unconfirmed"}</p>
                <p className="mt-1 text-muted-foreground">{lastResult.message}</p>
                {lastResult.details && <p className="mt-1 break-words text-xs text-muted-foreground">{lastResult.details}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Next step: {lastResult.retrySafe ? "correct the invoice data, then request review before retrying." : "the invoice status has been refreshed. Contact support to review the recorded attempt before trying again."}</p>
              </div>
            )}

            {(hasPersistedQrField || invoice.status === "Signed" || invoice.status === "Validated") && (
              <div className="mt-6 rounded-md border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">Submission status</h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <Row label="IRN" value={invoice.irn ?? "Not available"} />
                  <Row label="NRS sandbox submission" value={submissionLabel((invoice as { submission_status?: string | null }).submission_status)} />
                  {invoice.status === "Signed" && <Row label="CSID" value={csid ?? "CSID not returned by NRS"} />}
                </div>
                {(invoice.status === "Validated" || invoice.status === "Signed") && <p className="mt-3 text-xs text-muted-foreground">Current path: direct NRS sandbox validation and signing. APP handoff is planned and not live.</p>}
                {qrImageSource ? (
                  <div className="mt-4 flex flex-col items-start gap-2">
                    <p className="text-xs font-medium text-muted-foreground">QR code</p>
                    <img src={qrImageSource} alt="NRS invoice QR code" className="h-40 w-40 rounded-md border border-border bg-background p-2" />
                  </div>
                ) : (
                  hasPersistedQrField && (
                    <p className="mt-4 text-xs text-muted-foreground">QR code unavailable — the saved value is not a displayable image.</p>
                  )
                )}
              </div>
            )}

            {(() => {
              const inv = invoice;
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
                  {lines.map((line, i) => (
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
            <p className="mb-4 text-xs text-muted-foreground">Draft → approval → NRS sandbox signing (APP handoff planned)</p>
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
            {invoice.status !== "Draft" && invoice.status !== "In Review" && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">NRS sandbox submission</p>
                <SubmissionBadge status={(invoice as { submission_status?: string | null }).submission_status} showUnknown />
                <p className="mt-3 text-xs text-muted-foreground">Shown from the recorded submission status only. APP handoff is planned and not live.</p>
              </div>
            )}
            {invoice.status !== "Confirmed" && invoice.status !== "Rejected" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmReject(true)}
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

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject invoice {invoice.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the invoice as Rejected and removes it from the active compliance workflow. You will need to create a new invoice to resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
