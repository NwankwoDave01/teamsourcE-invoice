import {
  ArrowLeft,
  Box,
  Hash,
  Info,
  Package,
  Percent,
  Save,
  ShieldCheck,
  StickyNote,
  Tag,
  Wallet,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { products } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProductFormProps {
  mode: "create" | "edit";
}

export default function ProductForm({ mode }: ProductFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = mode === "edit" ? products.find((p) => p.id === id) : undefined;

  const isEdit = mode === "edit";
  const title = isEdit ? "Edit product" : "Add product";
  const description = isEdit
    ? "Update catalog details, pricing, and tax rate."
    : "Add a new product or service to your catalog.";

  const handleSave = () => {
    toast.success(isEdit ? "Product updated" : "Product created");
    navigate("/app/products");
  };

  const previewPrice = existing?.price ?? 0;
  const previewTax = existing?.taxRate ?? 7.5;
  const previewTotal = previewPrice + Math.round((previewPrice * previewTax) / 100);

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: "Products" }, { label: isEdit ? "Edit" : "New" }]}
        actions={
          <>
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to="/app/products">
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="h-4 w-4" />
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* ============================== MAIN COLUMN ============================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* ----- Basic info ----- */}
          <SectionCard
            icon={Package}
            title="Item details"
            description="Identify the product or service in your catalog."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Item name" required>
                <Input
                  defaultValue={existing?.name}
                  placeholder="e.g. Premium Parboiled Rice 50kg"
                />
              </Field>
              <Field label="SKU" required>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    defaultValue={existing?.sku}
                    placeholder="e.g. SF-RICE-50"
                    className="pl-9 font-mono"
                  />
                </div>
                <FieldHint>Unique stock-keeping identifier.</FieldHint>
              </Field>
              <Field label="Category">
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    defaultValue={existing?.category}
                    placeholder="e.g. Grains"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Field label="Unit of measure">
                <Select defaultValue={existing?.unit ?? "Bag"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bag">Bag</SelectItem>
                    <SelectItem value="Carton">Carton</SelectItem>
                    <SelectItem value="Jerry can">Jerry can</SelectItem>
                    <SelectItem value="Trip">Trip</SelectItem>
                    <SelectItem value="Hour">Hour</SelectItem>
                    <SelectItem value="Piece">Piece</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          {/* ----- Pricing ----- */}
          <SectionCard
            icon={Wallet}
            title="Pricing & tax"
            description="How this item is billed on invoices."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Unit price (NGN)" required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    ₦
                  </span>
                  <Input
                    type="number"
                    defaultValue={existing?.price}
                    placeholder="0"
                    className="pl-7 tabular-nums"
                  />
                </div>
              </Field>
              <Field label="Tax rate (%)" required>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.1"
                    defaultValue={existing?.taxRate ?? 7.5}
                    className="pl-9 tabular-nums"
                  />
                </div>
                <FieldHint>Standard Nigerian VAT is 7.5%.</FieldHint>
              </Field>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Box className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Active in catalog</p>
                  <p className="text-[11px] text-muted-foreground">
                    Inactive items can't be added to new invoices.
                  </p>
                </div>
              </div>
              <Switch defaultChecked={existing?.active ?? true} />
            </div>
          </SectionCard>

          {/* ----- Description ----- */}
          <SectionCard
            icon={StickyNote}
            title="Description"
            description="Optional details shown on invoice line items."
          >
            <Field label="Item description">
              <Textarea
                placeholder="A short description that appears under the item name on invoices…"
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
                <h2 className="text-sm font-semibold">
                  {isEdit ? "Item summary" : "New item"}
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {isEdit ? "Editing" : "Draft"}
                </span>
              </div>

              {isEdit && existing ? (
                <>
                  <div className="space-y-3 px-5 py-4 text-sm">
                    <SummaryRow label="Unit price" value={formatNGN(existing.price)} />
                    <SummaryRow label={`VAT (${existing.taxRate}%)`} value={formatNGN(Math.round((existing.price * existing.taxRate) / 100))} />
                  </div>
                  <div className="border-t border-border bg-gradient-to-br from-primary/5 to-primary/10 px-5 py-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Billed total
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Per {existing.unit?.toLowerCase()}</p>
                      </div>
                      <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {formatNGN(previewTotal)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2 px-5 py-4 text-sm text-muted-foreground">
                  <p>Fill in the details on the left to add this item to your catalog.</p>
                  <p className="text-xs">Active items will be available when creating invoices.</p>
                </div>
              )}

              <div className="space-y-2 border-t border-border p-4">
                <Button onClick={handleSave} className="w-full gap-1.5" size="sm">
                  <Save className="h-4 w-4" />
                  {isEdit ? "Save changes" : "Create product"}
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full gap-1.5 text-muted-foreground">
                  <Link to="/app/products">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to products
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-5 shadow-elegant-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <h2 className="text-sm font-semibold">Catalog tips</h2>
              </div>
              <ul className="space-y-2.5 text-sm">
                <CheckRow label="Use unique, scannable SKUs" />
                <CheckRow label="Match tax rate to product class" />
                <CheckRow label="Keep descriptions concise" />
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
  children,
}: {
  icon: typeof Package;
  title: string;
  description?: string;
  children: React.ReactNode;
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
      </div>
      <div className="p-5">{children}</div>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-info/15 text-info",
        )}
      >
        <Info className="h-3 w-3" />
      </span>
      <span className="text-sm text-foreground">{label}</span>
    </li>
  );
}