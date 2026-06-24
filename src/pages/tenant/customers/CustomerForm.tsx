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
  type DBCustomer,
} from "@/hooks/useCompanyData";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useVerifyTaxpayer } from "@/hooks/useVerifyTaxpayer";

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
  buyer_type: "business" | "individual" | "government" | "foreign";
  rc_number: string;
  address_line1: string;
  address_line2: string;
  state: string;
  lga: string;
  postcode: string;
  country_code: string;
};

export default function CustomerForm({ mode }: CustomerFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const { data: existing, isLoading } = useCustomer(isEdit ? id : undefined);
  const { data: invoices = [] } = useInvoices();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  
  const { verifyTaxpayer, isValidating } = useVerifyTaxpayer();
  const [regMode, setRegMode] = useState<"tin" | "cac">("tin");
  const [isVerified, setIsVerified] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "", tin: "", status: "Active", city: "", email: "", phone: "",
    buyer_type: "business", rc_number: "", address_line1: "", address_line2: "",
    state: "", lga: "", postcode: "", country_code: "NG",
  });

  useEffect(() => {
    if (existing) {
      const ex = existing as DBCustomer;
      setForm({
        name: existing.name,
        tin: existing.tin ?? "",
        status: (existing.status as "Active" | "Invited" | "Disabled") ?? "Active",
        city: existing.city ?? "",
        email: existing.email ?? "",
        phone: existing.phone ?? "",
        buyer_type: (ex.buyer_type as FormState["buyer_type"]) ?? "business",
        rc_number: ex.rc_number ?? "",
        address_line1: ex.address_line1 ?? "",
        address_line2: ex.address_line2 ?? "",
        state: ex.state ?? "",
        lga: ex.lga ?? "",
        postcode: ex.postcode ?? "",
        country_code: ex.country_code ?? "NG",
      });
      
      if (ex.rc_number && ex.rc_number.startsWith("RN-")) {
        setRegMode("cac");
        setIsVerified(false);
      } else if (existing.tin) {
        setRegMode("tin");
        setIsVerified(true);
      }
    }
  }, [existing]);

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm({ ...form, [k]: v });

  const title = isEdit ? "Edit customer" : "Add customer";
  const description = isEdit
    ? "Update billing and contact details for this customer."
    : "Create a new customer to start issuing invoices.";

  const handleVerifyTin = async (tinVal: string) => {
    if (!tinVal.trim()) return;
    try {
      const res = await verifyTaxpayer(tinVal);
      if (res.ok && res.data) {
        toast.success("Taxpayer TIN verified successfully!");
        setForm((prev) => ({
          ...prev,
          name: res.data.name,
          address_line1: res.data.address_line1,
          address_line2: res.data.address_line2 ?? "",
          city: res.data.city,
          state: res.data.state,
          email: res.data.email,
          phone: res.data.phone ?? prev.phone,
          lga: res.data.lga ?? prev.lga,
          postcode: res.data.postcode ?? prev.postcode,
          country_code: res.data.country_code ?? prev.country_code,
          rc_number: res.data.rc_number ?? prev.rc_number,
        }));
        setIsVerified(true);
      } else {
        toast.error(res.message || "TIN verification failed.");
        setIsVerified(false);
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Verification failed", { description: err.message });
      setIsVerified(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    try {
      const payload = { ...form };
      if (regMode === "cac") {
        payload.tin = "";
        if (payload.rc_number && !payload.rc_number.startsWith("RN-")) {
          payload.rc_number = `RN-${payload.rc_number}`;
        }
      } else {
        if (!payload.tin.trim()) {
          toast.error("Tax Identification Number (TIN) is required in TIN mode");
          return;
        }
      }

      if (isEdit && id) {
        await update.mutateAsync({ id, ...(payload as Partial<DBCustomer>) });
      } else {
        await create.mutateAsync({ ...(payload as Partial<DBCustomer> & { name: string }) });
      }
      toast.success(isEdit ? "Customer updated" : "Customer created");
      navigate("/app/customers");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Save failed", { description: err.message });
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
            {/* Registration Mode Segmented Toggle */}
            <div className="mb-6 flex rounded-md bg-muted p-1 max-w-md border border-border shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setRegMode("tin");
                  // Clear CAC flag if switching to TIN
                  if (form.rc_number.startsWith("RN-")) {
                    setForm(prev => ({ ...prev, rc_number: prev.rc_number.slice(3) }));
                  }
                }}
                className={cn(
                  "flex-1 rounded-[4px] py-1.5 text-xs font-semibold transition-all",
                  regMode === "tin"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5"
                )}
              >
                Verify via Corporate TIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegMode("cac");
                  setIsVerified(false);
                  // Clear TIN in CAC mode
                  setForm(prev => ({ ...prev, tin: "" }));
                }}
                className={cn(
                  "flex-1 rounded-[4px] py-1.5 text-xs font-semibold transition-all",
                  regMode === "cac"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5"
                )}
              >
                Register via CAC Incorporation Number
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Customer name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="e.g. Adeola Ventures Ltd"
                  disabled={regMode === "tin" && isVerified}
                />
              </Field>

              <Field label="Tax Identification Number (TIN)" required={regMode === "tin"}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.tin}
                      onChange={(e) => {
                        set("tin")(e.target.value);
                        if (isVerified) setIsVerified(false);
                      }}
                      onBlur={() => handleVerifyTin(form.tin)}
                      placeholder="NG-XXXXXXXX"
                      className="pl-9 font-mono"
                      disabled={regMode === "cac"}
                    />
                  </div>
                  {regMode === "tin" && (
                    <Button
                      type="button"
                      variant={isVerified ? "outline" : "default"}
                      onClick={() => {
                        if (isVerified) {
                          setIsVerified(false);
                        } else {
                          handleVerifyTin(form.tin);
                        }
                      }}
                      disabled={isValidating || !form.tin.trim()}
                      className="shrink-0 gap-1.5"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : isVerified ? (
                        <>
                          <ShieldCheck className="h-4 w-4 text-success" />
                          Reset
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  )}
                </div>
                <FieldHint>
                  {regMode === "cac"
                    ? "TIN is disabled in CAC registration mode."
                    : "Used for NRS validation. Press Verify or click away to auto-fill details."}
                </FieldHint>
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
                    disabled={regMode === "tin" && isVerified}
                  />
                </div>
              </Field>

              <Field label="Buyer type">
                <Select value={form.buyer_type} onValueChange={(v) => set("buyer_type")(v as FormState["buyer_type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="foreign">Foreign</SelectItem>
                  </SelectContent>
                </Select>
                <FieldHint>Used for NRS B2B / B2C / B2G classification.</FieldHint>
              </Field>

              <Field label={regMode === "cac" ? "CAC Incorporation Number" : "RC number"}>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.rc_number}
                    onChange={(e) => set("rc_number")(e.target.value)}
                    placeholder={regMode === "cac" ? "RN-XXXXXXX" : "RC-XXXXXXX"}
                    className="pl-9 font-mono"
                    disabled={regMode === "tin" && isVerified}
                  />
                </div>
                {regMode === "cac" && (
                  <FieldHint>Requires CAC incorporation number. Will be saved with 'RN-' prefix.</FieldHint>
                )}
              </Field>
            </div>
          </SectionCard>

          {/* ----- Registered address ----- */}
          <SectionCard
            icon={MapPin}
            title="Registered address"
            description="Required by NRS for B2B and B2G transactions."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Address line 1">
                <Input
                  value={form.address_line1}
                  onChange={(e) => set("address_line1")(e.target.value)}
                  placeholder="Street address"
                  disabled={regMode === "tin" && isVerified}
                />
              </Field>
              <Field label="Address line 2">
                <Input
                  value={form.address_line2}
                  onChange={(e) => set("address_line2")(e.target.value)}
                  placeholder="Suite, building, floor (optional)"
                  disabled={regMode === "tin" && isVerified}
                />
              </Field>
              <Field label="State">
                <Input
                  value={form.state}
                  onChange={(e) => set("state")(e.target.value)}
                  placeholder="e.g. Lagos"
                  disabled={regMode === "tin" && isVerified}
                />
              </Field>
              <Field label="LGA">
                <Input
                  value={form.lga}
                  onChange={(e) => set("lga")(e.target.value)}
                  placeholder="Local Government Area"
                  disabled={regMode === "tin" && isVerified}
                />
              </Field>
              <Field label="Postcode">
                <Input
                  value={form.postcode}
                  onChange={(e) => set("postcode")(e.target.value)}
                  placeholder="e.g. 100001"
                  disabled={regMode === "tin" && isVerified}
                />
              </Field>
              <Field label="Country code">
                <Input
                  value={form.country_code}
                  onChange={(e) => set("country_code")(e.target.value.toUpperCase())}
                  placeholder="NG"
                  maxLength={2}
                  className="font-mono uppercase"
                  disabled={regMode === "tin" && isVerified}
                />
                <FieldHint>ISO 3166-1 alpha-2 (e.g. NG).</FieldHint>
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
                    disabled={regMode === "tin" && isVerified}
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