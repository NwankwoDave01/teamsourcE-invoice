import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentCompany, useUpdateCompany } from "@/hooks/useCompanyData";
import type { NrsCompanyExtra } from "@/integrations/supabase/nrsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface AppConnectionDraft {
  businessAddress: string;
  businessAddressLg: string;
  businessAddressStreetName: string;
  businessCity: string;
  businessCountry: string;
  businessPostalCode: string;
  businessState: string;
  contactEmail: string;
  entityFirsId: string;
  businessFirsId: string;
  businessWebhookUrl: string;
  contractId: string;
}

const emptyAppDraft: AppConnectionDraft = {
  businessAddress: "", businessAddressLg: "", businessAddressStreetName: "",
  businessCity: "", businessCountry: "NG", businessPostalCode: "", businessState: "",
  contactEmail: "", entityFirsId: "", businessFirsId: "", businessWebhookUrl: "", contractId: "",
};

export default function Settings() {
  const { data: company, isLoading } = useCurrentCompany();
  const update = useUpdateCompany();
  const { roles } = useAuth();
  const [searchParams] = useSearchParams();
  const isCompanyAdmin = roles.includes("company_admin") || roles.includes("super_admin");
  const nrsCompany = company as (typeof company & Partial<NrsCompanyExtra>) | null | undefined;
  const [form, setForm] = useState({
    name: "", tin: "", industry: "",
    legal_name: "", rc_number: "", vat_number: "", email: "", phone: "",
    address_line1: "", address_line2: "", city: "", state: "", lga: "",
    postcode: "", country_code: "NG", industry_code: "",
  });

  const [nrs, setNrs] = useState({
    nrs_business_id: "",
    nrs_service_id: "",
    nrs_environment: "sandbox",
    nrs_sandbox_base_url: "",
    nrs_production_base_url: "",
  });

  const [appDraft, setAppDraft] = useState<AppConnectionDraft>(emptyAppDraft);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        tin: company.tin,
        industry: company.industry ?? "",
        legal_name: company.legal_name ?? "",
        rc_number: company.rc_number ?? "",
        vat_number: company.vat_number ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        address_line1: company.address_line1 ?? "",
        address_line2: company.address_line2 ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        lga: company.lga ?? "",
        postcode: company.postcode ?? "",
        country_code: company.country_code ?? "NG",
        industry_code: company.industry_code ?? "",
      });
      setNrs(nrsFromCompany());
      try {
        const saved = localStorage.getItem(`teamsource-app-connection:${company.id}`);
        setAppDraft(saved ? { ...emptyAppDraft, ...JSON.parse(saved) } : {
          ...emptyAppDraft,
          businessAddress: company.address_line1 ?? "",
          businessAddressLg: company.lga ?? "",
          businessAddressStreetName: company.address_line2 ?? "",
          businessCity: company.city ?? "",
          businessCountry: company.country_code ?? "NG",
          businessPostalCode: company.postcode ?? "",
          businessState: company.state ?? "",
          contactEmail: company.email ?? "",
        });
      } catch {
        setAppDraft(emptyAppDraft);
      }
    }
  }, [company]);

  function nrsFromCompany() {
    return {
      nrs_business_id: nrsCompany?.nrs_business_id ?? "",
      nrs_service_id: nrsCompany?.nrs_service_id ?? "",
      nrs_environment: nrsCompany?.nrs_environment ?? "sandbox",
      nrs_sandbox_base_url: nrsCompany?.nrs_sandbox_base_url ?? "",
      nrs_production_base_url: nrsCompany?.nrs_production_base_url ?? "",
    };
  }

  const handleSave = async () => {
    if (!company) return;
    try {
      await update.mutateAsync({ id: company.id, ...form });
      toast.success("Company profile updated");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to save", { description: err.message });
    }
  };

  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });
  const setN = (k: keyof typeof nrs) => (v: string) => setNrs({ ...nrs, [k]: v });
  const setApp = (k: keyof AppConnectionDraft) => (v: string) => setAppDraft({ ...appDraft, [k]: v });

  const handleSaveNrs = async () => {
    if (!company) return;
    if (!isCompanyAdmin) {
      toast.error("Only Company Admins can update NRS integration settings");
      return;
    }
    try {
      await update.mutateAsync({
        id: company.id,
        ...nrs,
        tin: form.tin,
        legal_name: form.legal_name,
        rc_number: form.rc_number,
        nrs_sandbox_base_url: nrs.nrs_sandbox_base_url || "https://eivc-k6z6d.ondigitalocean.app",
        nrs_production_base_url: nrs.nrs_production_base_url || "https://einvoice.nrs.gov.ng",
      });

      localStorage.setItem(`teamsource-app-connection:${company.id}`, JSON.stringify(appDraft));
      toast.success("NRS identifiers saved; APP onboarding draft kept on this device");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to save NRS settings", { description: err.message });
    }
  };

  const appDraftComplete = Object.values(appDraft).every((value) => value.trim().length > 0);
  const connectionState = appDraftComplete ? "Configured locally — connection pending" : "Awaiting APP details";

  return (
    <div>
      <PageHeader title="Settings" description="Configure your company workspace." />
      <div className="p-6">
        <Tabs defaultValue={searchParams.get("tab") === "nrs" ? "nrs" : "company"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="tax">Tax & Compliance</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="nrs">NRS / APP Connection</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                  setForm({
                    name: company.name, tin: company.tin, industry: company.industry ?? "",
                    legal_name: company.legal_name ?? "", rc_number: company.rc_number ?? "", vat_number: company.vat_number ?? "",
                    email: company.email ?? "", phone: company.phone ?? "",
                    address_line1: company.address_line1 ?? "", address_line2: company.address_line2 ?? "",
                    city: company.city ?? "", state: company.state ?? "", lga: company.lga ?? "",
                    postcode: company.postcode ?? "", country_code: company.country_code ?? "NG", industry_code: company.industry_code ?? "",
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
                <ToggleRow label="Auto-submit to APP after approval" desc="Reserved for the confirmed APP contract; currently inactive." />
                <ToggleRow label="Require dual approval over ₦5,000,000" desc="Invoices above the threshold need two approvers." defaultChecked />
                <ToggleRow label="Block invoices with unverified TIN" desc="Prevent submission until customer TIN is verified." defaultChecked />
              </div>
            </Card>
          </TabsContent>

          {[
            { value: "invoice", title: "Invoice" },
            { value: "notifications", title: "Notifications" },
          ].map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <Card className="p-6 shadow-elegant-sm">
                <h3 className="text-base font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Configuration for this section.</p>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="nrs">
            <Card className="border-border/80 bg-gradient-to-br from-card to-background p-6 shadow-elegant-sm">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                   <h3 className="text-lg font-semibold tracking-tight">NRS / APP Connection</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Configure how approved TeamSource invoices will connect to the appointed Access Point Provider (APP).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCompanyAdmin && (
                    <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs text-muted-foreground font-medium">
                      Read-only (Admin Required)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                     <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                     {connectionState}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Loading configuration…
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-md border border-info/30 bg-info/10 p-4 text-sm">
                    <p className="font-medium">Confirmed architecture</p>
                    <p className="mt-1 text-muted-foreground">TeamSource standardizes invoices using the NRS schema and sends approved invoices to the configured APP. The APP handles downstream NRS processing under its confirmed contract.</p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* Corporate Tax Identity Card */}
                    <Card className="p-5 border-border bg-card/40 backdrop-blur-xs flex flex-col gap-4 shadow-elegant-xs">
                      <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase border-b border-border/40 pb-2 flex items-center gap-2">
                        <span className="h-2 w-1 bg-primary rounded-full"></span>
                         Company identity
                      </h4>
                      
                      <div className="space-y-4">
                        <Field label="Tax Identification Number (TIN)">
                          <Input
                            value={form.tin}
                            onChange={(e) => set("tin")(e.target.value)}
                            placeholder="NG-XXXXXXXX"
                            className="font-mono"
                            disabled={!isCompanyAdmin}
                          />
                        </Field>

                        <Field label="Registered Legal Name">
                          <Input
                            value={form.legal_name}
                            onChange={(e) => set("legal_name")(e.target.value)}
                            placeholder="As registered with FIRS"
                            disabled={!isCompanyAdmin}
                          />
                        </Field>

                        <Field label="RC Number">
                          <Input
                            value={form.rc_number}
                            onChange={(e) => set("rc_number")(e.target.value)}
                            placeholder="RC-XXXXXXX"
                            className="font-mono"
                            disabled={!isCompanyAdmin}
                          />
                        </Field>
                      </div>
                    </Card>

                    {/* API Gateway Settings Card */}
                    <Card className="p-5 border-border bg-card/40 backdrop-blur-xs flex flex-col gap-4 shadow-elegant-xs">
                      <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase border-b border-border/40 pb-2 flex items-center gap-2">
                        <span className="h-2 w-1 bg-primary rounded-full"></span>
                         NRS identifiers
                      </h4>
                      
                      <div className="space-y-4">
                         <Field label="Connection environment">
                          <Select
                            value={nrs.nrs_environment}
                            onValueChange={(v) => setN("nrs_environment")(v)}
                            disabled={!isCompanyAdmin}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Environment" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sandbox">Sandbox / Testing</SelectItem>
                              <SelectItem value="production">Live / Production</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="NRS Business ID">
                            <Input
                              value={nrs.nrs_business_id}
                              onChange={(e) => setN("nrs_business_id")(e.target.value)}
                              placeholder="Issued by NRS"
                              className="font-mono"
                              disabled={!isCompanyAdmin}
                            />
                          </Field>

                          <Field label="NRS Service ID">
                            <Input
                              value={nrs.nrs_service_id}
                              onChange={(e) => setN("nrs_service_id")(e.target.value)}
                              placeholder="Issued by NRS"
                              className="font-mono"
                              disabled={!isCompanyAdmin}
                            />
                          </Field>

                        </div>

                        <p className="text-xs text-muted-foreground">Business ID identifies the company. Service ID is used when TeamSource forms the IRN.</p>
                      </div>
                    </Card>

                  </div>

                   <Card className="space-y-4 border-border bg-card/40 p-5 shadow-elegant-xs">
                    <div>
                       <h4 className="text-sm font-semibold tracking-wide uppercase">APP onboarding details</h4>
                       <p className="mt-1 text-xs text-muted-foreground">These confirmed onboarding fields are kept as a local draft on this device until the APP endpoint and storage contract are confirmed.</p>
                    </div>
                     <div className="grid gap-4 md:grid-cols-2">
                       <AppField label="Business address" description="Full registered business address." value={appDraft.businessAddress} onChange={setApp("businessAddress")} disabled={!isCompanyAdmin} />
                       <AppField label="Local government area" description="APP field: businessAddressLg." value={appDraft.businessAddressLg} onChange={setApp("businessAddressLg")} disabled={!isCompanyAdmin} />
                       <AppField label="Street name" description="APP field: businessAddressStreetName." value={appDraft.businessAddressStreetName} onChange={setApp("businessAddressStreetName")} disabled={!isCompanyAdmin} />
                       <AppField label="City" description="Registered business city." value={appDraft.businessCity} onChange={setApp("businessCity")} disabled={!isCompanyAdmin} />
                       <AppField label="Country code" description="Two-letter country code; defaults to NG." value={appDraft.businessCountry} onChange={(v) => setApp("businessCountry")(v.toUpperCase())} disabled={!isCompanyAdmin} maxLength={2} />
                       <AppField label="Postal code" description="Registered business postal code." value={appDraft.businessPostalCode} onChange={setApp("businessPostalCode")} disabled={!isCompanyAdmin} />
                       <AppField label="State" description="Registered business state." value={appDraft.businessState} onChange={setApp("businessState")} disabled={!isCompanyAdmin} />
                       <AppField label="Contact email" description="Operational contact for APP onboarding." value={appDraft.contactEmail} onChange={setApp("contactEmail")} disabled={!isCompanyAdmin} type="email" />
                       <AppField label="Entity FIRS ID" description="APP onboarding field: entityFirsId." value={appDraft.entityFirsId} onChange={setApp("entityFirsId")} disabled={!isCompanyAdmin} />
                       <AppField label="Business FIRS ID" description="APP onboarding field: businessFirsId." value={appDraft.businessFirsId} onChange={setApp("businessFirsId")} disabled={!isCompanyAdmin} />
                       <AppField label="Business webhook URL" description="Callback URL to register after the webhook contract is confirmed." value={appDraft.businessWebhookUrl} onChange={setApp("businessWebhookUrl")} disabled={!isCompanyAdmin} type="url" />
                       <AppField label="Contract ID" description="TeamSource ↔ APP integration identifier; this is not a password or API key." value={appDraft.contractId} onChange={setApp("contractId")} disabled={!isCompanyAdmin} />
                     </div>
                  </Card>

                   <Card className="flex items-start gap-3 border-warning/30 bg-warning/10 p-4">
                     <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                     <div className="text-xs text-muted-foreground"><p className="font-medium text-foreground">Connection is not live yet</p><p className="mt-1">APP endpoint, request method, contract ID transport, response fields, and callback lifecycle remain pending. If the APP later requires a secret, it will be stored and used only by the backend.</p></div>
                  </Card>

                  {/* Trust & Security / Actions Footer */}
                  <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-border/80 pt-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-2 rounded-lg border border-border/50 w-fit">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
                       <span>TeamSource customer access uses native workspace authentication. No taxpayer login or API secret is required here.</span>
                    </div>

                    {isCompanyAdmin && (
                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (!company) return;
                            setNrs(nrsFromCompany());
                            try {
                              const saved = localStorage.getItem(`teamsource-app-connection:${company.id}`);
                              setAppDraft(saved ? { ...emptyAppDraft, ...JSON.parse(saved) } : emptyAppDraft);
                            } catch { setAppDraft(emptyAppDraft); }
                          }}
                           disabled={update.isPending}
                        >
                          Reset
                        </Button>
                        
                        <Button 
                          onClick={handleSaveNrs} 
                           disabled={update.isPending}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all"
                        >
                           {update.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                           Save identifiers & local draft
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
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

function AppField({ label, description, value, onChange, disabled, type = "text", maxLength }: {
  label: string; description: string; value: string; onChange: (value: string) => void;
  disabled: boolean; type?: string; maxLength?: number;
}) {
  return <Field label={label}>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} maxLength={maxLength} />
    <p className="text-[11px] text-muted-foreground">{description}</p>
  </Field>;
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
