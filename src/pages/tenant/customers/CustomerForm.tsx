import {
  ArrowLeft,
  Building2,
  Hash,
  Info,
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
import { customers } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CustomerFormProps {
  mode: "create" | "edit";
}

export default function CustomerForm({ mode }: CustomerFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = mode === "edit" ? customers.find((c) => c.id === id) : undefined;

  const isEdit = mode === "edit";
  const title = isEdit ? "Edit customer" : "Add customer";
  const description = isEdit
    ? "Update billing and contact details for this customer."
    : "Create a new customer to start issuing invoices.";

  const handleSave = () => {
    toast.success(isEdit ? "Customer updated" : "Customer created");
    navigate("/app/customers");
  };

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
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="h-4 w-4" />
              {isEdit ? "Save changes" : "Create customer"}
            </Button>
          </>
        }
      />

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
                  defaultValue={existing?.name}
                  placeholder="e.g. Adeola Ventures Ltd"
                />
              </Field>
              <Field label="Tax Identification Number (TIN)" required>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    defaultValue={existing?.tin}
                    placeholder="NG-XXXXXXXX"
                    className="pl-9 font-mono"
                  />
                </div>
                <FieldHint>Used for NRS validation and invoice compliance.</FieldHint>
              </Field>
              <Field label="Status">
                <Select defaultValue={existing?.status ?? "Active"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    defaultValue={existing?.city}
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
              <Field label="Email address" required>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    defaultValue={existing?.email}
                    placeholder="billing@company.com"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Field label="Phone number">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    defaultValue={existing?.phone}
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
                  <SummaryRow label="Outstanding" value={formatNGN(existing.outstanding)} />
                  <SummaryRow label="Invoices issued" value={String(existing.invoices)} />
                  <SummaryRow label="Status" value={existing.status} />
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
                <Button onClick={handleSave} className="w-full gap-1.5" size="sm">
                  <Save className="h-4 w-4" />
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