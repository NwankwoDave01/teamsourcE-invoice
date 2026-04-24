import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Clock, Download, Printer, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invoices, INVOICE_STATUSES, customers } from "@/mock/data";
import { formatNGN, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function InvoiceDetails() {
  const { id } = useParams();
  const invoice = invoices.find((i) => i.id === id) ?? invoices[0];
  const customer = customers.find((c) => c.id === invoice.customerId);

  const workflow = INVOICE_STATUSES.filter((s) => s !== "Rejected");
  const currentIdx = workflow.indexOf(invoice.status as typeof workflow[number]);

  return (
    <div>
      <PageHeader
        title={invoice.number}
        description={`Issued to ${invoice.customerName}`}
        breadcrumbs={[{ label: "Invoices" }, { label: invoice.number }]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/invoices"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Printer className="h-4 w-4" />Print</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />PDF</Button>
            <Button size="sm" className="gap-1.5"><Send className="h-4 w-4" />Submit to NRS</Button>
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
                <p className="mt-1 font-medium">Sahara Foods Ltd</p>
                <p className="text-sm text-muted-foreground">12 Marina Road, Lagos</p>
                <p className="text-sm text-muted-foreground">TIN: NG-12834521</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill to</p>
                <p className="mt-1 font-medium">{customer?.name}</p>
                <p className="text-sm text-muted-foreground">{customer?.city}, Nigeria</p>
                <p className="text-sm text-muted-foreground">TIN: {customer?.tin}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued</p>
                <p className="mt-1">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="mt-1">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Description</th>
                    <th className="px-4 py-2.5 text-right font-medium w-20">Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Unit price</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3">{line.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{line.qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNGN(line.unitPrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatNGN(line.qty * line.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatNGN(invoice.subtotal)} />
              <Row label="VAT (7.5%)" value={formatNGN(invoice.tax)} />
              <div className="my-2 border-t border-border" />
              <Row label="Total" value={formatNGN(invoice.total)} bold />
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
          </Card>

          <Card className="p-5 shadow-elegant-sm">
            <h3 className="text-base font-semibold">Activity</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {[
                { who: invoice.createdBy, what: "created the invoice", when: "2 days ago" },
                { who: "Tunde A.", what: "approved internally", when: "1 day ago" },
                { who: "System", what: "submitted to NRS", when: "6 hours ago" },
                { who: "NRS", what: "validated successfully", when: "3 hours ago" },
              ].map((a, i) => (
                <li key={i} className="flex gap-3">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span></p>
                    <p className="text-xs text-muted-foreground">{a.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
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
