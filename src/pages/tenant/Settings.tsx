import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentCompany, useUpdateCompany } from "@/hooks/useCompanyData";
import { toast } from "sonner";

export default function Settings() {
  const { data: company, isLoading } = useCurrentCompany();
  const update = useUpdateCompany();
  const [form, setForm] = useState({
    name: "", tin: "", industry: "",
    legal_name: "", rc_number: "", vat_number: "", email: "", phone: "",
    address_line1: "", address_line2: "", city: "", state: "", lga: "",
    postcode: "", country_code: "NG", industry_code: "",
  });

  useEffect(() => {
    if (company) {
      const c = company as any;
      setForm({
        name: company.name,
        tin: company.tin,
        industry: company.industry ?? "",
        legal_name: c.legal_name ?? "",
        rc_number: c.rc_number ?? "",
        vat_number: c.vat_number ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        address_line1: c.address_line1 ?? "",
        address_line2: c.address_line2 ?? "",
        city: c.city ?? "",
        state: c.state ?? "",
        lga: c.lga ?? "",
        postcode: c.postcode ?? "",
        country_code: c.country_code ?? "NG",
        industry_code: c.industry_code ?? "",
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;
    try {
      await update.mutateAsync({ id: company.id, ...(form as any) });
      toast.success("Company profile updated");
    } catch (e: any) {
      toast.error("Failed to save", { description: e.message });
    }
  };

  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      <PageHeader title="Settings" description="Configure your company workspace." />
      <div className="p-6">
        <Tabs defaultValue="company" className="space-y-4">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="tax">Tax & Compliance</TabsTrigger>
            <TabsTrigger value="numbering">Invoice numbering</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="p-6 shadow-elegant-sm">
              <h3 className="mb-4 text-base font-semibold">Company profile</h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
              <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Legal name">
                  <Input value={form.name} onChange={(e) => set("name")(e.target.value)} />
                </Field>
                <Field label="Industry">
                  <Input value={form.industry} onChange={(e) => set("industry")(e.target.value)} />
                </Field>
                <Field label="TIN">
                  <Input value={form.tin} onChange={(e) => set("tin")(e.target.value)} />
                </Field>
                <Field label="Registered legal name (NRS)">
                  <Input value={form.legal_name} onChange={(e) => set("legal_name")(e.target.value)} placeholder="As registered with CAC" />
                </Field>
                <Field label="RC number">
                  <Input value={form.rc_number} onChange={(e) => set("rc_number")(e.target.value)} placeholder="RC-XXXXXXX" className="font-mono" />
                </Field>
                <Field label="VAT number">
                  <Input value={form.vat_number} onChange={(e) => set("vat_number")(e.target.value)} placeholder="Optional" className="font-mono" />
                </Field>
                <Field label="Industry code">
                  <Input value={form.industry_code} onChange={(e) => set("industry_code")(e.target.value)} placeholder="ISIC / NAICS (optional)" className="font-mono" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="billing@company.com" />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+234 800 000 0000" />
                </Field>
                <Field label="Plan">
                  <Input value={company?.plan ?? ""} disabled />
                </Field>
                <Field label="Status">
                  <Input value={company?.status ?? ""} disabled />
                </Field>
                <Field label="Created">
                  <Input value={company ? new Date(company.created_at).toLocaleDateString() : ""} disabled />
                </Field>
                <Field label="Address line 1">
                  <Input value={form.address_line1} onChange={(e) => set("address_line1")(e.target.value)} placeholder="Street address" />
                </Field>
                <Field label="Address line 2">
                  <Input value={form.address_line2} onChange={(e) => set("address_line2")(e.target.value)} placeholder="Suite, building, floor (optional)" />
                </Field>
                <Field label="City">
                  <Input value={form.city} onChange={(e) => set("city")(e.target.value)} placeholder="e.g. Lagos" />
                </Field>
                <Field label="State">
                  <Input value={form.state} onChange={(e) => set("state")(e.target.value)} placeholder="e.g. Lagos" />
                </Field>
                <Field label="LGA">
                  <Input value={form.lga} onChange={(e) => set("lga")(e.target.value)} placeholder="Local Government Area" />
                </Field>
                <Field label="Postcode">
                  <Input value={form.postcode} onChange={(e) => set("postcode")(e.target.value)} placeholder="e.g. 100001" />
                </Field>
                <Field label="Country code">
                  <Input value={form.country_code} onChange={(e) => set("country_code")(e.target.value.toUpperCase())} placeholder="NG" maxLength={2} className="font-mono uppercase" />
                </Field>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  if (!company) return;
                  const c = company as any;
                  setForm({
                    name: company.name, tin: company.tin, industry: company.industry ?? "",
                    legal_name: c.legal_name ?? "", rc_number: c.rc_number ?? "", vat_number: c.vat_number ?? "",
                    email: c.email ?? "", phone: c.phone ?? "",
                    address_line1: c.address_line1 ?? "", address_line2: c.address_line2 ?? "",
                    city: c.city ?? "", state: c.state ?? "", lga: c.lga ?? "",
                    postcode: c.postcode ?? "", country_code: c.country_code ?? "NG", industry_code: c.industry_code ?? "",
                  });
                }}>
                  Reset
                </Button>
                <Button onClick={handleSave} disabled={update.isPending}>
                  {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
              </>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card className="p-6 shadow-elegant-sm">
              <h3 className="mb-4 text-base font-semibold">Tax & compliance</h3>
              <div className="space-y-4">
                <ToggleRow label="Charge VAT on all invoices" desc="Apply 7.5% VAT by default to taxable line items." defaultChecked />
                <ToggleRow label="Auto-submit to NRS after approval" desc="Send approved invoices to NRS without manual click." />
                <ToggleRow label="Require dual approval over ₦5,000,000" desc="Invoices above the threshold need two approvers." defaultChecked />
                <ToggleRow label="Block invoices with unverified TIN" desc="Prevent submission until customer TIN is verified." defaultChecked />
              </div>
            </Card>
          </TabsContent>

          {["branding","numbering","notifications","integrations"].map((v) => (
            <TabsContent key={v} value={v}>
              <Card className="p-6 shadow-elegant-sm">
                <h3 className="text-base font-semibold capitalize">{v.replace(/^./, (s) => s.toUpperCase())}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Configuration for this section.</p>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
