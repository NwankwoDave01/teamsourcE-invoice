import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  GripVertical,
  Info,
  Package,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers, useProducts, useInvoices, useCreateInvoice } from "@/hooks/useCompanyData";
import { INVOICE_TYPE_OPTIONS, TRANSACTION_TYPE_OPTIONS, PAYMENT_MEANS_OPTIONS } from "@/lib/nrs/codes";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LineDraft {
  id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  unit_code: string;
  tax_category: "S" | "Z" | "E" | "O";
  discount_amount: number;
  item_classification_code: string | null;
}

const newLine = (): LineDraft => ({
  id: crypto.randomUUID(),
  product_id: null,
  description: "",
  qty: 1,
  unit_price: 0,
  tax_rate: 7.5,
  unit_code: "EA",
  tax_category: "S",
  discount_amount: 0,
  item_classification_code: null,
});

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: existingInvoices = [] } = useInvoices();
  const createMut = useCreateInvoice();

  const [customerId, setCustomerId] = useState<string>("");
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(30));
  const [poRef, setPoRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [invoiceType, setInvoiceType] = useState<string>("commercial");
  const [transactionType, setTransactionType] = useState<string>("B2B");
  const [supplyDate, setSupplyDate] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [paymentMeansCode, setPaymentMeansCode] = useState<string>("30");
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  // Auto-generate next invoice number
  useEffect(() => {
    if (number) return;
    const year = new Date().getFullYear();
    const next = existingInvoices.length + 1;
    setNumber(`INV-${year}-${String(next).padStart(5, "0")}`);
  }, [existingInvoices.length, number]);

  // Default to first customer when loaded
  useEffect(() => {
    if (!customerId && customers.length) setCustomerId(customers[0].id);
  }, [customers, customerId]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const tax = lines.reduce((s, l) => s + l.qty * l.unit_price * (l.tax_rate / 100), 0);
  const total = subtotal + tax;

  const updateLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));
  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const pickProduct = (lineId: string, productId: string) => {
    const p = products.find((p) => p.id === productId);
    if (!p) return;
    const px = p as any;
    updateLine(lineId, {
      product_id: p.id,
      description: p.name,
      unit_price: Number(p.price),
      tax_rate: Number(p.tax_rate),
      unit_code: px.unit_code ?? "EA",
      tax_category: (px.tax_category as LineDraft["tax_category"]) ?? "S",
      item_classification_code: px.item_classification_code ?? null,
    });
  };

  const handleSubmit = async (status: "Draft" | "submit") => {
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    if (!lines.length || lines.some((l) => !l.description || l.qty <= 0)) {
      toast.error("Add at least one valid line item");
      return;
    }
    try {
      const inv = await createMut.mutateAsync({
        number,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        issue_date: issueDate,
        due_date: dueDate,
        notes: notes || undefined,
        po_reference: poRef || undefined,
        invoice_type: invoiceType,
        transaction_type: transactionType,
        supply_date: supplyDate || null,
        payment_terms: paymentTerms || null,
        payment_means_code: paymentMeansCode,
        exchange_rate: exchangeRate,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          description: l.description,
          qty: l.qty,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          unit_code: l.unit_code,
          tax_category: l.tax_category,
          discount_amount: l.discount_amount,
          item_classification_code: l.item_classification_code,
        })),
      });
      toast.success(status === "Draft" ? "Draft saved" : "Invoice created");
      navigate(`/app/invoices/${inv.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create invoice");
    }
  };

  const saving = createMut.isPending;

  return (
    <div>
      <PageHeader
        title="Create invoice"
        description="Draft a new invoice. It will enter the workflow as Draft."
        breadcrumbs={[{ label: "Invoices" }, { label: "New" }]}
        actions={
          <>
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to="/app/invoices">
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={saving} onClick={() => handleSubmit("Draft")} className="gap-1.5">
              <Save className="h-4 w-4" />
              Save draft
            </Button>
            <Button size="sm" disabled={saving} onClick={() => handleSubmit("submit")} className="gap-1.5">
              <Send className="h-4 w-4" />
              Create invoice
            </Button>
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer & details */}
          <SectionCard icon={User} title="Customer & details" description="Who is this invoice for and when is it due?">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Customer" required>
                {customers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No customers yet.{" "}
                    <Link to="/app/customers/new" className="text-primary hover:underline">
                      Add one
                    </Link>
                  </p>
                ) : (
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCustomer && (
                  <FieldHint>
                    TIN: {selectedCustomer.tin ?? "—"} · {selectedCustomer.city ?? "—"}
                  </FieldHint>
                )}
              </Field>
              <Field label="Invoice number" required>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} />
                <FieldHint>Auto-generated. You may override.</FieldHint>
              </Field>
              <Field label="Issue date" required>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="pl-9" />
                </div>
              </Field>
              <Field label="Due date" required>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="pl-9" />
                </div>
              </Field>
              <Field label="Currency">
                <Select defaultValue="NGN">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN — Nigerian Naira</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="PO reference">
                <Input value={poRef} onChange={(e) => setPoRef(e.target.value)} placeholder="e.g. PO-2025-447 (optional)" />
              </Field>
              <Field label="Invoice type">
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Transaction type">
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Supply date">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={supplyDate} onChange={(e) => setSupplyDate(e.target.value)} className="pl-9" />
                </div>
                <FieldHint>Date goods/services were supplied. Defaults to issue date if blank.</FieldHint>
              </Field>
              <Field label="Payment terms">
                <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
              </Field>
              <Field label="Payment means">
                <Select value={paymentMeansCode} onValueChange={setPaymentMeansCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MEANS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Exchange rate">
                <Input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="tabular-nums"
                />
                <FieldHint>Required only for non-NGN invoices.</FieldHint>
              </Field>
            </div>
          </SectionCard>

          {/* Line items */}
          <SectionCard
            icon={Package}
            title="Line items"
            description="Add products or services to this invoice."
            action={
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={addLine} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add line
                </Button>
              </div>
            }
            noPadding
          >
            <div className="grid grid-cols-[16px_1fr_88px_148px_88px_148px_36px] items-center gap-3 border-y border-border bg-muted/30 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span />
              <span>Item / description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Tax</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            <div className="divide-y divide-border">
              {lines.map((line) => {
                const lineTotal = line.qty * line.unit_price * (1 + line.tax_rate / 100);
                return (
                  <div
                    key={line.id}
                    className="group grid grid-cols-[16px_1fr_88px_148px_88px_148px_36px] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                  >
                    <button type="button" className="cursor-grab text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100">
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <div className="min-w-0 space-y-1.5">
                      {products.length > 0 && (
                        <Select value={line.product_id ?? ""} onValueChange={(v) => pickProduct(line.id, v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Pick from catalog…" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Description"
                        className="h-8 text-sm"
                      />
                    </div>

                    <Input
                      type="number"
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                      className="h-9 text-right tabular-nums"
                    />
                    <Input
                      type="number"
                      value={line.unit_price}
                      onChange={(e) => updateLine(line.id, { unit_price: Number(e.target.value) })}
                      className="h-9 text-right tabular-nums"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={line.tax_rate}
                      onChange={(e) => updateLine(line.id, { tax_rate: Number(e.target.value) })}
                      className="h-9 text-right tabular-nums"
                    />
                    <div className="text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatNGN(Math.round(lineTotal))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      className="h-8 w-8 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="flex w-full items-center justify-center gap-2 border-t border-dashed border-border bg-muted/20 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Add another line
            </button>
          </SectionCard>

          <SectionCard icon={StickyNote} title="Notes & terms" description="Visible to the customer on the issued invoice.">
            <Field label="Notes for customer">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, bank details, thank-you note…"
                rows={4}
                className="resize-none"
              />
            </Field>
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="sticky top-20 space-y-6">
            <Card className="overflow-hidden border-border shadow-elegant">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="text-sm font-semibold">Invoice summary</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Draft
                </span>
              </div>

              <div className="space-y-3 px-5 py-4 text-sm">
                <SummaryRow label="Subtotal" value={formatNGN(subtotal)} />
                <SummaryRow label="VAT" value={formatNGN(Math.round(tax))} />
              </div>

              <div className="border-t border-border bg-gradient-to-br from-primary/5 to-primary/10 px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total due</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">NGN — incl. VAT</p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{formatNGN(Math.round(total))}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border p-4">
                <Button onClick={() => handleSubmit("submit")} disabled={saving} className="w-full gap-1.5" size="sm">
                  <Send className="h-4 w-4" />
                  Create invoice
                </Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => handleSubmit("Draft")} className="w-full gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save draft
                </Button>
              </div>
            </Card>

            <Card className="p-5 shadow-elegant-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <h2 className="text-sm font-semibold">Compliance preview</h2>
              </div>
              <ul className="space-y-2.5 text-sm">
                <CheckRow ok={!!selectedCustomer?.tin} label="Customer TIN provided" />
                <CheckRow ok={lines.every((l) => l.tax_rate > 0)} label="Tax rates set on every line" />
                <CheckRow info label="Will route to Finance Officer" />
                <CheckRow info label="Eligible for NRS after approval" />
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Helpers ----------------------------- */

function SectionCard({
  icon: Icon, title, description, action, children, noPadding,
}: {
  icon: typeof Package; title: string; description?: string;
  action?: React.ReactNode; children: React.ReactNode; noPadding?: boolean;
}) {
  return (
    <Card className="overflow-hidden shadow-elegant-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={cn(noPadding ? "" : "p-5")}>{children}</div>
    </Card>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Info className="h-3 w-3" />
      {children}
    </p>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground">{label}</span>
      <span className="tabular-nums font-medium text-foreground">{value}</span>
    </div>
  );
}

function CheckRow({ label, ok, info }: { label: string; ok?: boolean; info?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        ok && "bg-success/15 text-success",
        info && !ok && "bg-info/15 text-info",
        !ok && !info && "bg-muted text-muted-foreground",
      )}>
        {ok ? <CheckCircle2 className="h-3 w-3" /> : <Info className="h-3 w-3" />}
      </span>
      <span className="text-sm text-foreground">{label}</span>
    </li>
  );
}
