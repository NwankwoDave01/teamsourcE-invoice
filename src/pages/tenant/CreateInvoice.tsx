import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronsUpDown,
  FileText,
  Info,
  Loader2,
  Package,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useCustomers,
  useProducts,
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  type DBProduct,
  type DBInvoiceStatus,
} from "@/hooks/useCompanyData";
import { TRANSACTION_TYPE_OPTIONS } from "@/lib/nrs/codes";
import { NRS_INVOICE_TYPE_CODES } from "@/lib/nrs/invoiceTypeCode";
import { useNrsMasterData } from "@/hooks/useNrsMasterData";
import {
  invoiceTypeDisplayLabel,
  paymentMeansDisplayLabel,
} from "@/lib/nrs/displayLabels";
import { formatCurrency, formatNGN } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
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
  tax_category: string;
  discount_amount: number;
  item_classification_code: string | null;
  hsn_code: string | null;
  product_category: string | null;
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
  hsn_code: null,
  product_category: null,
});

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_CURRENCIES = [
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
];

const supportedInvoiceTypeCodes: ReadonlySet<string> = new Set(NRS_INVOICE_TYPE_CODES);

export default function CreateInvoice({ mode = "create" }: { mode?: "create" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get("duplicate") ?? undefined;
  const isEditing = mode === "edit";
  const sourceId = isEditing ? id : duplicateId;

  let roles: string[] = [];
  let isSuperAdmin = false;
  try {
    const auth = useAuth();
    roles = (auth.roles as string[]) ?? [];
    isSuperAdmin = auth.isSuperAdmin ?? false;
  } catch {
    // Graceful fallback when rendered without AuthProvider in standalone component tests
  }
  const isStaff = roles.includes("staff_user") && !roles.includes("company_owner") && !roles.includes("company_admin") && !roles.includes("finance_officer") && !isSuperAdmin;

  const { data: sourceInvoice, isLoading: loadingSource } = useInvoice(sourceId);
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: existingInvoices = [] } = useInvoices();
  const createMut = useCreateInvoice();
  const updateMut = useUpdateInvoice();

  const [customerId, setCustomerId] = useState<string>("");
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(30));
  const [poRef, setPoRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [invoiceType, setInvoiceType] = useState<string>("381");
  const [transactionType, setTransactionType] = useState<string>("B2B");
  const [supplyDate, setSupplyDate] = useState<string>("");
  const [paymentMeansCode, setPaymentMeansCode] = useState<string>("");
  const [currency, setCurrency] = useState<string>("NGN");
  const [initialized, setInitialized] = useState(false);

  const { data: currenciesRaw } = useNrsMasterData("currencies");
  const { data: paymentMeansRaw } = useNrsMasterData("payment-means");
  const { data: invoiceTypesRaw } = useNrsMasterData("invoice-types");

  const currencies = currenciesRaw ?? [];
  const paymentMeans = paymentMeansRaw ?? [];
  const invoiceTypes = (invoiceTypesRaw ?? []).filter((option) =>
    supportedInvoiceTypeCodes.has(option.code)
  );

  // Populate from source invoice (for Edit or Duplicate)
  useEffect(() => {
    if (sourceInvoice && !initialized) {
      setCustomerId(sourceInvoice.customer_id ?? "");
      if (isEditing) {
        setNumber(sourceInvoice.number);
        setIssueDate(sourceInvoice.issue_date);
        setDueDate(sourceInvoice.due_date);
      }
      setPoRef(sourceInvoice.po_reference ?? "");
      setNotes(sourceInvoice.notes ?? "");
      setInvoiceType(sourceInvoice.invoice_type ?? "381");
      setTransactionType(sourceInvoice.transaction_type ?? "B2B");
      setSupplyDate(sourceInvoice.supply_date ?? "");
      setPaymentMeansCode(sourceInvoice.payment_means_code ?? "");
      setCurrency(sourceInvoice.currency ?? "NGN");

      if (sourceInvoice.lines && sourceInvoice.lines.length > 0) {
        setLines(
          sourceInvoice.lines.map((l) => ({
            id: isEditing ? l.id : crypto.randomUUID(),
            product_id: l.product_id,
            description: l.description,
            qty: Number(l.qty),
            unit_price: Number(l.unit_price),
            tax_rate: Number(l.tax_rate),
            unit_code: l.unit_code ?? "EA",
            tax_category: l.tax_category ?? "S",
            discount_amount: Number(l.discount_amount ?? 0),
            item_classification_code: l.item_classification_code ?? null,
            hsn_code: l.hsn_code ?? null,
            product_category: l.product_category ?? null,
          })),
        );
      }
      setInitialized(true);
    }
  }, [sourceInvoice, isEditing, initialized]);

  useEffect(() => {
    const availablePaymentMeans = paymentMeansRaw ?? [];
    if (!paymentMeansCode && availablePaymentMeans.length > 0) {
      setPaymentMeansCode(availablePaymentMeans[0].code);
    }
  }, [paymentMeansRaw, paymentMeansCode]);

  // Auto-generate next invoice number when creating a new invoice or duplicate
  useEffect(() => {
    if (isEditing || number) return;
    const year = new Date().getFullYear();
    const next = existingInvoices.length + 1;
    setNumber(`INV-${year}-${String(next).padStart(5, "0")}`);
  }, [existingInvoices.length, number, isEditing]);

  // Default to first customer when loaded in create mode
  useEffect(() => {
    if (!customerId && customers.length && !sourceId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId, sourceId]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const tax = lines.reduce((s, l) => s + l.qty * l.unit_price * (l.tax_rate / 100), 0);
  const total = subtotal + tax;

  const updateLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) =>
    setLines((prev) => (prev.length <= 1 ? [newLine()] : prev.filter((l) => l.id !== id)));

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const unlinkProduct = (lineId: string) => {
    updateLine(lineId, {
      product_id: null,
    });
  };

  const pickProduct = (lineId: string, productId: string) => {
    const p = products.find((p) => p.id === productId);
    if (!p) return;
    updateLine(lineId, {
      product_id: p.id,
      description: p.description?.trim() ? p.description.trim() : p.name,
      unit_price: Number(p.price),
      tax_rate: Number(p.tax_rate),
      unit_code: p.unit_code ?? "EA",
      tax_category: p.tax_category ?? "S",
      item_classification_code: p.item_classification_code ?? null,
      hsn_code: p.hsn_code ?? null,
      product_category: p.product_category ?? null,
    });
  };

  const handleSubmit = async (status: "Draft" | "submit") => {
    setHasAttemptedSubmit(true);
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    if (!lines.length || lines.some((l) => !l.description.trim() || l.qty <= 0)) {
      toast.error("Add at least one valid line item with description and quantity");
      return;
    }

    try {
      if (isEditing && id) {
        await updateMut.mutateAsync({
          id,
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
          payment_means_code: paymentMeansCode,
          currency,
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
            hsn_code: l.hsn_code,
            product_category: l.product_category,
          })),
        });
        toast.success("Invoice updated");
        navigate(`/app/invoices/${id}`);
      } else {
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
          payment_means_code: paymentMeansCode,
          currency,
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
            hsn_code: l.hsn_code,
            product_category: l.product_category,
          })),
        });
        toast.success(status === "Draft" ? "Draft saved" : "Invoice created");
        navigate(`/app/invoices/${inv.id}`);
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message ?? (isEditing ? "Failed to update invoice" : "Failed to create invoice"));
    }
  };

  const isProtectedStatus =
    isEditing &&
    sourceInvoice &&
    ["Submitted", "Validated", "Signed", "Confirmed", "Rejected"].includes(sourceInvoice.status);

  if (isEditing && loadingSource) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isProtectedStatus && sourceInvoice) {
    return (
      <div>
        <PageHeader
          title={`Edit ${sourceInvoice.number}`}
          description="Protected compliance stage."
          breadcrumbs={[
            { label: "Invoices", href: "/app/invoices" },
            { label: sourceInvoice.number, href: `/app/invoices/${sourceInvoice.id}` },
            { label: "Edit" },
          ]}
        />
        <div className="p-6">
          <Card className="p-6 max-w-xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-semibold text-lg">Invoice Cannot Be Edited</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This invoice is in the protected compliance stage <strong>{sourceInvoice.status}</strong>.
              Invoices that have entered external verification, signing or confirmation cannot be modified.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/app/invoices/${sourceInvoice.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to invoice
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isStaffEditingNonDraft =
    isEditing &&
    sourceInvoice &&
    isStaff &&
    sourceInvoice.status !== "Draft";

  if (isStaffEditingNonDraft && sourceInvoice) {
    return (
      <div>
        <PageHeader
          title={`Edit ${sourceInvoice.number}`}
          description="Draft invoices only."
          breadcrumbs={[
            { label: "Invoices", href: "/app/invoices" },
            { label: sourceInvoice.number, href: `/app/invoices/${sourceInvoice.id}` },
            { label: "Edit" },
          ]}
        />
        <div className="p-6">
          <Card className="p-6 max-w-xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-semibold text-lg">Invoice Cannot Be Edited</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Staff users can only edit draft invoices. This invoice is in stage <strong>{sourceInvoice.status}</strong>.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/app/invoices/${sourceInvoice.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to invoice
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <PageHeader
        title={
          isEditing
            ? `Edit invoice ${number || ""}`
            : duplicateId
              ? "New invoice (Duplicate)"
              : "Create invoice"
        }
        description={
          isEditing
            ? "Update invoice details and line items."
            : duplicateId && sourceInvoice
              ? `Duplicated from ${sourceInvoice.number}. Review and save as a new draft.`
              : "Draft a new invoice. It will enter the workflow as Draft."
        }
        breadcrumbs={
          isEditing
            ? [
                { label: "Invoices", href: "/app/invoices" },
                { label: number || "Invoice", href: id ? `/app/invoices/${id}` : undefined },
                { label: "Edit" },
              ]
            : [{ label: "Invoices", href: "/app/invoices" }, { label: "New" }]
        }
        actions={
          <>
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to={isEditing && id ? `/app/invoices/${id}` : "/app/invoices"}>
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => handleSubmit("Draft")}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              {isEditing ? "Save changes" : "Save draft"}
            </Button>
            {!isEditing && (
              <Button
                size="sm"
                disabled={saving}
                onClick={() => handleSubmit("submit")}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Create invoice
              </Button>
            )}
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
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
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
                    {invoiceTypes.map((o) => (
                      <SelectItem key={o.code} value={o.code}>{invoiceTypeDisplayLabel(o)}</SelectItem>
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
              <Field label="Payment means">
                <Select value={paymentMeansCode} onValueChange={setPaymentMeansCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMeans.map((pm) => (
                      <SelectItem key={pm.code} value={pm.code}>{paymentMeansDisplayLabel(pm)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1fr_84px_136px_84px_128px_40px] items-center gap-3 border-y border-border bg-muted/30 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Item / description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit price</span>
                  <span className="text-right">Tax (%)</span>
                  <span className="text-right">Line total</span>
                  <span />
                </div>

                <div className="divide-y divide-border">
                  {lines.map((line, idx) => {
                    const lineTotal = line.qty * line.unit_price * (1 + line.tax_rate / 100);
                    const isMissingDesc = hasAttemptedSubmit && !line.description.trim();
                    const isInvalidQty = hasAttemptedSubmit && (line.qty <= 0 || isNaN(line.qty));

                    return (
                      <div
                        key={line.id}
                        className="group px-5 py-3 transition-colors hover:bg-muted/15 space-y-2"
                      >
                        {/* Top row: Line index and Catalog Selector */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground/70">#{idx + 1}</span>
                            <LineItemProductPicker
                              selectedProductId={line.product_id}
                              products={products}
                              currency={currency}
                              onSelectProduct={(p) => pickProduct(line.id, p.id)}
                              onUnlinkProduct={() => unlinkProduct(line.id)}
                            />
                          </div>
                        </div>

                        {/* Main inputs row */}
                        <div className="grid grid-cols-[1fr_84px_136px_84px_128px_40px] items-center gap-3">
                          <div className="min-w-0">
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(line.id, { description: e.target.value })}
                              placeholder="Description of goods or services *"
                              className={cn(
                                "h-9 text-sm",
                                isMissingDesc && "border-destructive focus-visible:ring-destructive/30"
                              )}
                            />
                          </div>

                          <Input
                            type="number"
                            min="1"
                            step="any"
                            value={line.qty === 0 ? "" : line.qty}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                              updateLine(line.id, { qty: isNaN(val) ? 0 : val });
                            }}
                            className={cn(
                              "h-9 text-right tabular-nums",
                              isInvalidQty && "border-destructive focus-visible:ring-destructive/30"
                            )}
                            placeholder="1"
                          />

                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={line.unit_price === 0 ? "" : line.unit_price}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                              updateLine(line.id, { unit_price: isNaN(val) ? 0 : val });
                            }}
                            className="h-9 text-right tabular-nums"
                            placeholder="0.00"
                          />

                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.tax_rate === 0 ? "" : line.tax_rate}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                              updateLine(line.id, { tax_rate: isNaN(val) ? 0 : val });
                            }}
                            className="h-9 text-right tabular-nums"
                            placeholder="7.5"
                          />

                          <div className="text-right text-sm font-semibold tabular-nums text-foreground truncate">
                            {formatCurrency(lineTotal, currency, 2)}
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={lines.length <= 1}
                              onClick={() => removeLine(line.id)}
                              className={cn(
                                "h-8 w-8 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive",
                                lines.length <= 1 ? "opacity-20 cursor-not-allowed" : "opacity-70 hover:opacity-100"
                              )}
                              title={lines.length <= 1 ? "At least one line item is required" : "Remove line"}
                              aria-label={`Remove line ${idx + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Inline validation and NRS advisory banner */}
                        {(isMissingDesc || isInvalidQty || (line.product_id && !line.item_classification_code)) && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {isMissingDesc && (
                              <span className="text-[11px] text-destructive inline-flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Description is required
                              </span>
                            )}
                            {isInvalidQty && (
                              <span className="text-[11px] text-destructive inline-flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Quantity must be greater than 0
                              </span>
                            )}
                            {line.product_id && !line.item_classification_code && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 rounded px-2 py-0.5 inline-flex items-center gap-1">
                                <Info className="h-3 w-3 shrink-0" />
                                <span>NRS schema classification required before NRS sandbox signing.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="md:hidden divide-y divide-border border-y border-border">
              {lines.map((line, idx) => {
                const lineTotal = line.qty * line.unit_price * (1 + line.tax_rate / 100);
                const isMissingDesc = hasAttemptedSubmit && !line.description.trim();
                const isInvalidQty = hasAttemptedSubmit && (line.qty <= 0 || isNaN(line.qty));

                return (
                  <div key={line.id} className="p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Line #{idx + 1}</span>
                        <LineItemProductPicker
                          selectedProductId={line.product_id}
                          products={products}
                          currency={currency}
                          onSelectProduct={(p) => pickProduct(line.id, p.id)}
                          onUnlinkProduct={() => unlinkProduct(line.id)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(line.id)}
                        className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                        title={lines.length <= 1 ? "At least one line item is required" : "Remove line"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </Button>
                    </div>

                    {/* Description field */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Description *</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Description of goods or services"
                        className={cn("h-9 text-sm", isMissingDesc && "border-destructive focus-visible:ring-destructive/30")}
                      />
                      {isMissingDesc && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Description is required
                        </p>
                      )}
                    </div>

                    {/* 3-column subgrid for Qty, Price, Tax */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium uppercase text-muted-foreground">Qty *</Label>
                        <Input
                          type="number"
                          min="1"
                          step="any"
                          value={line.qty === 0 ? "" : line.qty}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateLine(line.id, { qty: isNaN(val) ? 0 : val });
                          }}
                          className={cn("h-9 text-right tabular-nums", isInvalidQty && "border-destructive focus-visible:ring-destructive/30")}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium uppercase text-muted-foreground">Price ({currency})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.unit_price === 0 ? "" : line.unit_price}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateLine(line.id, { unit_price: isNaN(val) ? 0 : val });
                          }}
                          className="h-9 text-right tabular-nums"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium uppercase text-muted-foreground">Tax (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={line.tax_rate === 0 ? "" : line.tax_rate}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateLine(line.id, { tax_rate: isNaN(val) ? 0 : val });
                          }}
                          className="h-9 text-right tabular-nums"
                          placeholder="7.5"
                        />
                      </div>
                    </div>
                    {isInvalidQty && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Quantity must be greater than 0
                      </p>
                    )}

                    {/* NRS advisory banner */}
                    {line.product_id && !line.item_classification_code && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 rounded px-2 py-1 inline-flex items-center gap-1">
                        <Info className="h-3 w-3 shrink-0" />
                        <span>NRS schema classification required before NRS sandbox signing.</span>
                      </div>
                    )}

                    {/* Mobile Line Total Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <span className="text-muted-foreground font-medium">Line total ({currency}):</span>
                      <span className="font-semibold text-sm tabular-nums text-foreground">
                        {formatCurrency(lineTotal, currency, 2)}
                      </span>
                    </div>
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
                <SummaryRow label="Subtotal" value={formatCurrency(subtotal, currency, 2)} />
                <SummaryRow label="VAT" value={formatCurrency(tax, currency, 2)} />
              </div>

              <div className="border-t border-border bg-gradient-to-br from-primary/5 to-primary/10 px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total due</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{currency} — incl. VAT</p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(total, currency, 2)}</p>
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
                 <CheckRow info label="Eligible for NRS sandbox signing after approval" />
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

function LineItemProductPicker({
  selectedProductId,
  products,
  currency,
  onSelectProduct,
  onUnlinkProduct,
}: {
  selectedProductId: string | null;
  products: DBProduct[];
  currency: string;
  onSelectProduct: (p: DBProduct) => void;
  onUnlinkProduct: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  if (selectedProduct) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="secondary"
          className="gap-1.5 py-0.5 px-2 text-xs font-normal bg-primary/10 text-primary border-primary/20"
        >
          <Package className="h-3 w-3 shrink-0" />
          <span className="font-medium truncate max-w-[180px]">{selectedProduct.name}</span>
          <span className="text-muted-foreground text-[10px]">({selectedProduct.sku})</span>
        </Badge>
        <button
          type="button"
          onClick={onUnlinkProduct}
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1 py-0.5 rounded hover:bg-muted"
          title="Unlink catalog product (keeps line item as custom)"
          aria-label="Unlink catalog product"
        >
          <X className="h-3 w-3" />
          <span>Unlink</span>
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground font-normal border-dashed"
        >
          <Package className="h-3 w-3 text-muted-foreground" />
          <span>Pick from catalog</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search catalog by name or SKU..." className="h-9 text-xs" />
          <CommandList className="max-h-60">
            <CommandEmpty className="p-3 text-xs text-muted-foreground text-center">
              No matching products found.
            </CommandEmpty>
            <CommandGroup heading="Catalog products">
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.sku} ${p.category ?? ""}`}
                  onSelect={() => {
                    onSelectProduct(p);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2 text-xs cursor-pointer"
                >
                  <div className="flex flex-col min-w-0 mr-2">
                    <span className="font-medium text-foreground truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      SKU: {p.sku} {p.category ? `· ${p.category}` : ""}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(Number(p.price), currency, 2)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      +{Number(p.tax_rate)}% tax
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
