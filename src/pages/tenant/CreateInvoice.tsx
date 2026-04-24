import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customers, products } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CreateInvoice() {
  const subtotal = 235_500;
  const tax = Math.round(subtotal * 0.075);
  const discount = 0;
  const total = subtotal + tax - discount;

  const lineRows = [
    { product: products[0], qty: 10 },
    { product: products[1], qty: 5 },
    { product: products[8], qty: 2 },
  ];

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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Save className="h-4 w-4" />
              Save draft
            </Button>
            <Button size="sm" className="gap-1.5">
              <Send className="h-4 w-4" />
              Submit for review
            </Button>
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* ============================== MAIN COLUMN ============================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* ----- Customer & details ----- */}
          <SectionCard
            icon={User}
            title="Customer & details"
            description="Who is this invoice for and when is it due?"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Customer" required>
                <Select defaultValue={customers[0].id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldHint>TIN: {customers[0].tin} · {customers[0].city}</FieldHint>
              </Field>
              <Field label="Invoice number" required>
                <Input defaultValue="INV-2025-01041" />
                <FieldHint>Auto-generated. You may override.</FieldHint>
              </Field>
              <Field label="Issue date" required>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" defaultValue="2025-10-28" className="pl-9" />
                </div>
              </Field>
              <Field label="Due date" required>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" defaultValue="2025-11-27" className="pl-9" />
                </div>
              </Field>
              <Field label="Currency">
                <Select defaultValue="NGN">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NGN">NGN — Nigerian Naira</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="PO reference">
                <Input placeholder="e.g. PO-2025-447 (optional)" />
              </Field>
            </div>
          </SectionCard>

          {/* ----- Line items ----- */}
          <SectionCard
            icon={Package}
            title="Line items"
            description="Add products or services to this invoice."
            action={
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  From catalog
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add line
                </Button>
              </div>
            }
            noPadding
          >
            {/* Header row */}
            <div className="grid grid-cols-[16px_1fr_88px_148px_88px_148px_36px] items-center gap-3 border-y border-border bg-muted/30 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span />
              <span>Item / description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Tax</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            {/* Line rows */}
            <div className="divide-y divide-border">
              {lineRows.map(({ product, qty }) => {
                const lineTotal = product.price * qty;
                return (
                  <div
                    key={product.id}
                    className="group grid grid-cols-[16px_1fr_88px_148px_88px_148px_36px] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                  >
                    <button
                      type="button"
                      className="cursor-grab text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{product.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{product.sku}</span>
                        <span>·</span>
                        <span>{product.category}</span>
                      </div>
                    </div>

                    <Input
                      type="number"
                      defaultValue={qty}
                      className="h-9 text-right tabular-nums"
                    />

                    <Input
                      type="number"
                      defaultValue={product.price}
                      className="h-9 text-right tabular-nums"
                    />

                    <div className="text-right text-sm tabular-nums text-muted-foreground">
                      {product.taxRate}%
                    </div>

                    <div className="text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatNGN(lineTotal)}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add row footer */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 border-t border-dashed border-border bg-muted/20 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Add another line
            </button>
          </SectionCard>

          {/* ----- Notes ----- */}
          <SectionCard
            icon={StickyNote}
            title="Notes & terms"
            description="Visible to the customer on the issued invoice."
          >
            <Field label="Notes for customer">
              <Textarea
                placeholder="Payment terms, bank details, thank-you note…"
                rows={4}
                className="resize-none"
              />
            </Field>
          </SectionCard>
        </div>

        {/* ============================== SIDEBAR (sticky) ============================== */}
        <div className="space-y-6">
          <div className="sticky top-20 space-y-6">
            {/* Summary */}
            <Card className="overflow-hidden border-border shadow-elegant">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="text-sm font-semibold">Invoice summary</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Draft
                </span>
              </div>

              <div className="space-y-3 px-5 py-4 text-sm">
                <SummaryRow label="Subtotal" value={formatNGN(subtotal)} />
                <SummaryRow label="VAT (7.5%)" value={formatNGN(tax)} />
                <SummaryRow
                  label="Discount"
                  value={discount === 0 ? "—" : `-${formatNGN(discount)}`}
                  muted
                  action={
                    <button className="text-xs font-medium text-primary hover:underline">Add</button>
                  }
                />
              </div>

              <div className="border-t border-border bg-gradient-to-br from-primary/5 to-primary/10 px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Total due
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">NGN — incl. VAT</p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {formatNGN(total)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border p-4">
                <Button className="w-full gap-1.5" size="sm">
                  <Send className="h-4 w-4" />
                  Submit for review
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    Save draft
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                </div>
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  Drafts are saved automatically every 30s
                </p>
              </div>
            </Card>

            {/* Compliance preview */}
            <Card className="p-5 shadow-elegant-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <h2 className="text-sm font-semibold">Compliance preview</h2>
              </div>
              <ul className="space-y-2.5 text-sm">
                <CheckRow ok label="Customer TIN verified" />
                <CheckRow ok label="Tax rates match catalog" />
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

/* ----------------------------- Helper components ----------------------------- */

function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  noPadding,
}: {
  icon: typeof Package;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
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
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className={cn(noPadding ? "" : "p-5")}>{children}</div>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

function SummaryRow({
  label,
  value,
  muted,
  action,
}: {
  label: string;
  value: string;
  muted?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
        {action}
      </div>
      <span
        className={cn(
          "tabular-nums font-medium",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CheckRow({ label, ok, info }: { label: string; ok?: boolean; info?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          ok && "bg-success/15 text-success",
          info && "bg-info/15 text-info",
        )}
      >
        {ok ? <CheckCircle2 className="h-3 w-3" /> : <Info className="h-3 w-3" />}
      </span>
      <span className="text-sm text-foreground">{label}</span>
    </li>
  );
}
