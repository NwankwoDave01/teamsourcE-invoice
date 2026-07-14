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
import { useEffect, useState } from "react";
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
import { formatNGN } from "@/lib/format";
import { useCreateProduct, useProduct, useUpdateProduct, type DBProduct } from "@/hooks/useCompanyData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNrsMasterData } from "@/hooks/useNrsMasterData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo } from "react";

const DEFAULT_UNITS = [
  { code: "EA", label: "Each" },
  { code: "Bag", label: "Bag" },
  { code: "Carton", label: "Carton" },
  { code: "Jerry can", label: "Jerry can" },
  { code: "Trip", label: "Trip" },
  { code: "Hour", label: "Hour" },
  { code: "Piece", label: "Piece" },
];

const DEFAULT_TAX_CATEGORIES = [
  { code: "S", label: "Standard Rated VAT (7.5%)" },
  { code: "Z", label: "Zero Rated VAT (0%)" },
  { code: "E", label: "VAT Exempt (0%)" },
  { code: "O", label: "Out of Scope (0%)" },
];

const DEFAULT_CLASSIFICATIONS = [
  { code: "1006.30", label: "1006.30 - Rice, semi-milled or wholly milled", metadata: null as Record<string, unknown> | null },
  { code: "2106.90", label: "2106.90 - Food preparations, n.e.s.", metadata: null as Record<string, unknown> | null },
  { code: "8517.12", label: "8517.12 - Telephones for cellular networks", metadata: null as Record<string, unknown> | null },
  { code: "8471.30", label: "8471.30 - Portable automatic data processing machines", metadata: null as Record<string, unknown> | null },
  { code: "9983.11", label: "9983.11 - Management consulting services", metadata: null as Record<string, unknown> | null },
  { code: "9983.13", label: "9983.13 - Information technology consulting services", metadata: null as Record<string, unknown> | null },
];

interface ProductFormProps {
  mode: "create" | "edit";
}

export default function ProductForm({ mode }: ProductFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const { data: existing, isLoading } = useProduct(isEdit ? id : undefined);
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("Bag");
  const [price, setPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(7.5);
  const [active, setActive] = useState(true);
  const [unitCode, setUnitCode] = useState<string>("EA");
  const [taxCategory, setTaxCategory] = useState<string>("S");
  const [classificationCode, setClassificationCode] = useState<string>("");
  const [openClassification, setOpenClassification] = useState(false);
  const [hsnCode, setHsnCode] = useState<string>("");
  const [productCategory, setProductCategory] = useState<string>("");

  const { data: unitCodesRaw } = useNrsMasterData("unit-codes");
  const { data: taxCategoriesRaw } = useNrsMasterData("tax-categories");
  const { data: hsCodesRaw } = useNrsMasterData("hs-codes");
  const { data: serviceCodesRaw } = useNrsMasterData("services-codes");

  const unitCodes = unitCodesRaw && unitCodesRaw.length > 0 ? unitCodesRaw : DEFAULT_UNITS;
  const taxCategories = taxCategoriesRaw && taxCategoriesRaw.length > 0 ? taxCategoriesRaw : DEFAULT_TAX_CATEGORIES;

  const classificationOptions = useMemo(() => {
    const combined = [...(hsCodesRaw ?? []), ...(serviceCodesRaw ?? [])];
    return combined.length > 0 ? combined : DEFAULT_CLASSIFICATIONS;
  }, [hsCodesRaw, serviceCodesRaw]);

  useEffect(() => {
    if (existing) {
      const ex = existing as DBProduct;
      setName(existing.name);
      setSku(existing.sku);
      setCategory(existing.category ?? "");
      setUnit(existing.unit ?? "Bag");
      setPrice(Number(existing.price));
      setTaxRate(Number(existing.tax_rate));
      setActive(existing.active);
      setUnitCode(ex.unit_code ?? "EA");
      setTaxCategory(ex.tax_category ?? "S");
      setClassificationCode(ex.item_classification_code ?? "");
      setHsnCode(ex.hsn_code ?? "");
      setProductCategory(ex.product_category ?? "");
    }
  }, [existing]);

  const title = isEdit ? "Edit product" : "Add product";
  const description = isEdit
    ? "Update catalog details, pricing, and tax rate."
    : "Add a new product or service to your catalog.";

  const handleSave = async () => {
    if (!name.trim() || !sku.trim()) {
      toast.error("Name and SKU are required");
      return;
    }
    try {
      if (isEdit && id) {
        await updateMut.mutateAsync({
          id, name, sku, category: category || null, unit, price, tax_rate: taxRate, active,
          unit_code: unitCode,
          tax_category: taxCategory,
          item_classification_code: classificationCode || null,
          hsn_code: hsnCode || null,
          product_category: productCategory || null,
        });
        toast.success("Product updated");
      } else {
        await createMut.mutateAsync({
          name, sku, category: category || null, unit, price, tax_rate: taxRate, active,
          unit_code: unitCode,
          tax_category: taxCategory,
          item_classification_code: classificationCode || null,
          hsn_code: hsnCode || null,
          product_category: productCategory || null,
        });
        toast.success("Product created");
      }
      navigate("/app/products");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message ?? "Failed to save product");
    }
  };

  const previewTotal = price + Math.round((price * taxRate) / 100);
  const saving = createMut.isPending || updateMut.isPending;

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
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Premium Parboiled Rice 50kg"
                />
              </Field>
              <Field label="SKU" required>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
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
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Grains"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Field label="Unit of measure">
                <Select value={unit} onValueChange={setUnit}>
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
              <Field label="Item classification (HS / CPC)">
                <Popover open={openClassification} onOpenChange={setOpenClassification}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openClassification}
                      className="w-full justify-between font-mono text-left h-10 font-normal animate-none"
                    >
                      <span className="truncate">
                        {classificationCode
                          ? classificationOptions.find((o) => o.code === classificationCode)?.label || classificationCode
                          : "Select classification code..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search code or description..." />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>No classification found.</CommandEmpty>
                        <CommandGroup>
                          {classificationOptions.map((o) => (
                            <CommandItem
                              key={o.code}
                              value={`${o.code} ${o.label}`}
                              onSelect={() => {
                                setClassificationCode(o.code);
                                setHsnCode(o.code);
                                setProductCategory(o.label);
                                setOpenClassification(false);

                                // Check metadata for default tax rate or code
                                if (o.metadata) {
                                  const metadata = o.metadata;
                                  const values = Object.values(metadata).map(v => String(v).toUpperCase());
                                  
                                  let selectedCategory: "S" | "Z" | "E" | "O" | null = null;
                                  let selectedRate: number | null = null;

                                  const mapCodeToCategory = (code: string) => {
                                    const c = code.toUpperCase();
                                    if (c === "STANDARD_VAT" || c === "STANDARD" || c === "S") return "S";
                                    if (c === "ZERO_VAT" || c === "ZERO" || c === "Z") return "Z";
                                    if (c === "EXEMPT_VAT" || c === "EXEMPT" || c === "E") return "E";
                                    if (c === "OUT_OF_SCOPE" || c === "O") return "O";
                                    return null;
                                  };

                                  const taxCategoryVal = metadata.tax_category || metadata.tax_code || metadata.default_tax_code || metadata.default_tax_category;
                                  if (typeof taxCategoryVal === "string") {
                                    const mapped = mapCodeToCategory(taxCategoryVal);
                                    if (mapped) selectedCategory = mapped;
                                  }

                                  const taxRateVal = metadata.tax_rate ?? metadata.default_tax_rate;
                                  if (typeof taxRateVal === "number") {
                                    selectedRate = taxRateVal;
                                    if (selectedRate === 7.5) selectedCategory = "S";
                                    else if (selectedRate === 0 && !selectedCategory) selectedCategory = "Z";
                                  }

                                  if (!selectedCategory) {
                                    for (const val of values) {
                                      const mapped = mapCodeToCategory(val);
                                      if (mapped) {
                                        selectedCategory = mapped;
                                        break;
                                      }
                                    }
                                  }

                                  if (selectedCategory) {
                                    setTaxCategory(selectedCategory);
                                    if (selectedCategory === "S") {
                                      setTaxRate(selectedRate ?? 7.5);
                                    } else {
                                      setTaxRate(0);
                                    }
                                  }
                                }
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  classificationCode === o.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-mono font-medium mr-1.5">{o.code}</span>
                              <span className="text-muted-foreground truncate">{o.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FieldHint>HS or CPC code used for NRS item classification.</FieldHint>
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
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
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
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="pl-9 tabular-nums"
                  />
                </div>
                <FieldHint>Standard Nigerian VAT is 7.5%.</FieldHint>
              </Field>
              <Field label="Unit code (NRS)">
                <Select value={unitCode} onValueChange={setUnitCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {unitCodes.map((o) => (
                      <SelectItem key={o.code} value={o.code}>{o.label} ({o.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldHint>UN/ECE Rec 20 unit code for NRS reporting.</FieldHint>
              </Field>
              <Field label="Tax category">
                <Select value={taxCategory} onValueChange={(v) => setTaxCategory(v as "S" | "Z" | "E" | "O")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxCategories.map((o) => (
                      <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Switch checked={active} onCheckedChange={setActive} />
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
                    <SummaryRow label="Unit price" value={formatNGN(price)} />
                    <SummaryRow label={`VAT (${taxRate}%)`} value={formatNGN(Math.round((price * taxRate) / 100))} />
                  </div>
                  <div className="border-t border-border bg-gradient-to-br from-primary/5 to-primary/10 px-5 py-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Billed total
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Per {unit.toLowerCase()}</p>
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
                <Button onClick={handleSave} disabled={saving} className="w-full gap-1.5" size="sm">
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