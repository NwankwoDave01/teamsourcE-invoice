import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Hash,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  StickyNote,
  UserCheck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useInvoices,
} from "@/hooks/useCompanyData";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CustomerFormProps {
  mode: "create" | "edit";
}

type FormState = {
  name: string;
  tin: string;
  status: "Active" | "Invited" | "Disabled";
  city: string;
  email: string;
  phone: string;
};

export default function CustomerForm({ mode }: CustomerFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const { data: existing, isLoading } = useCustomer(isEdit ? id : undefined);
  const { data: invoices = [] } = useInvoices();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  const [form, setForm] = useState<FormState>({
    name: "", tin: "", status: "Active", city: "", email: "", phone: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        tin: existing.tin ?? "",
        status: (existing.status as "Active" | "Invited" | "Disabled") ?? "Active",
        city: existing.city ?? "",
        email: existing.email ?? "",
        phone: existing.phone ?? "",
      });
    }
  }, [existing]);

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm({ ...form, [k]: v });

  const title = isEdit ? "Edit customer" : "Add customer";
  const description = isEdit
    ? "Update billing and contact details for this customer."
    : "Create a new customer to start issuing invoices.";

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, ...form });
      } else {
        await create.mutateAsync(form as any);
      }
      toast.success(isEdit ? "Customer updated" : "Customer created");
      navigate("/app/customers");
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    }
  };

  // Stats for edit mode
  const stats = (() => {
    if (!isEdit || !id) return null;
    let count = 0, outstanding = 0;
    for (const inv of invoices) {
      if (inv.customer_id === id) {
        count += 1;
        if (["Submitted", "Validated", "Approved", "Ready"].includes(inv.status)) {
          outstanding += Number(inv.total);
        }
      }
    }
    return { count, outstanding };
  })();

  const saving = create.isPending || update.isPending;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: "Customers" }, { label: isEdit ? "Edit" : "New" }]}
        actions={
          <>
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to="/app/customers">
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save changes" : "Create customer"}
            </Button>
          </>
        }
      />

      {isEdit && isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading customer…
        </div>
      ) : (
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* ============================== MAIN COLUMN ============================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* ----- Business profile ----- */}
          <SectionCard
            icon={Building2}
            title="Business profile"
            description="Legal name and tax identification."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Customer name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="e.g. Adeola Ventures Ltd"
                />
              </Field>
              <Field label="Tax Identification Number (TIN)">
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.tin}
                    onChange={(e) => set("tin")(e.target.value)}
                    placeholder="NG-XXXXXXXX"
                    className="pl-9 font-mono"
                  />
                </div>
                <FieldHint>Used for NRS validation and invoice compliance.</FieldHint>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status")(v as FormState["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.city}
                    onChange={(e) => set("city")(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="pl-9"
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* ----- Contact ----- */}
          <SectionCard
            icon={UserCheck}
            title="Primary contact"
            description="Who should we send invoices and reminders to?"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Email address">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email")(e.target.value)}
                    placeholder="billing@company.com"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Field label="Phone number">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="pl-9"
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* ----- Notes ----- */}
          <SectionCard
            icon={StickyNote}
            title="Internal notes"
            description="Only visible to your team — not shown on invoices."
          >
            <Field label="Notes">
              <Textarea
                placeholder="Payment preferences, key contacts, special arrangements…"
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
                  {isEdit ? "Customer summary" : "New customer"}
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {isEdit ? "Editing" : "Draft"}
                </span>
              </div>

              {isEdit && existing ? (
                <div className="space-y-3 px-5 py-4 text-sm">
                  <SummaryRow label="Outstanding" value={formatNGN(stats?.outstanding ?? 0)} />
                  <SummaryRow label="Invoices issued" value={String(stats?.count ?? 0)} />
                  <SummaryRow label="Status" value={form.status} />
                </div>
              ) : (
                <div className="space-y-2 px-5 py-4 text-sm text-muted-foreground">
                  <p>Fill in the details on the left to register this customer.</p>
                  <p className="text-xs">
                    You'll be able to issue invoices to them right after saving.
                  </p>
                </div>
              )}

              <div className="space-y-2 border-t border-border p-4">
                <Button onClick={handleSave} disabled={saving} className="w-full gap-1.5" size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? "Save changes" : "Create customer"}
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full gap-1.5 text-muted-foreground">
                  <Link to="/app/customers">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to customers
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Compliance */}
            <Card className="p-5 shadow-elegant-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <h2 className="text-sm font-semibold">Best practices</h2>
              </div>
              <ul className="space-y-2.5 text-sm">
                <CheckRow label="Verify TIN before first invoice" />
                <CheckRow label="Confirm billing email is monitored" />
                <CheckRow label="Keep contact phone up to date" />
              </ul>
            </Card>
          </div>
        </div>
      </div>
      )}
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
  icon: typeof Building2;
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