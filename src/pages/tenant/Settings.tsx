import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, Lock, Key, HelpCircle, CheckCircle2, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentCompany, useUpdateCompany } from "@/hooks/useCompanyData";
import {
  useNrsCredentialStatus,
  useSaveNrsCredentials,
  useSaveNrsCrypto,
  useDisconnectNrsCredentials,
} from "@/hooks/useNrsCredentials";
import type { NrsCompanyExtra } from "@/integrations/supabase/nrsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Settings() {
  const { data: company, isLoading } = useCurrentCompany();
  const update = useUpdateCompany();
  const { roles, companyId } = useAuth();
  const isCompanyAdmin = roles.includes("company_admin") || roles.includes("super_admin");
  const nrsCompany = company as (typeof company & Partial<NrsCompanyExtra>) | null | undefined;
  const { data: credStatus, isLoading: statusLoading } = useNrsCredentialStatus();
  const saveCreds = useSaveNrsCredentials();
  const saveCrypto = useSaveNrsCrypto();
  const disconnectCreds = useDisconnectNrsCredentials();
  const [form, setForm] = useState({
    name: "", tin: "", industry: "",
    legal_name: "", rc_number: "", vat_number: "", email: "", phone: "",
    address_line1: "", address_line2: "", city: "", state: "", lga: "",
    postcode: "", country_code: "NG", industry_code: "",
  });

  // NRS Integration — non-secret configuration only. Secrets live in Vault
  // behind the `nrs-credentials` Edge Function and are never read back here.
  const [nrs, setNrs] = useState({
    nrs_business_id: "",
    nrs_service_id: "",
    nrs_environment: "sandbox",
    nrs_sandbox_base_url: "",
    nrs_production_base_url: "",
  });

  // Write-only secret inputs. Blank = leave the stored value unchanged.
  const [secrets, setSecrets] = useState({
    api_key: "",
    api_secret: "",
  });

  const [cryptoText, setCryptoText] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  

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
      setSecrets({ api_key: "", api_secret: "" });
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
  const setS = (k: keyof typeof secrets) => (v: string) => setSecrets({ ...secrets, [k]: v });

  // Save company identity and write-only credentials independently of taxpayer login.
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

      const pending: Record<string, string> = {};
      if (secrets.api_key.trim()) pending.api_key = secrets.api_key.trim();
      if (secrets.api_secret.trim()) pending.api_secret = secrets.api_secret.trim();
      if (Object.keys(pending).length > 0) {
        await saveCreds.mutateAsync(pending);
        setSecrets({ api_key: "", api_secret: "" });
      }
      toast.success("NRS settings saved");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to save NRS settings", { description: err.message });
    }
  };

  const handleDisconnectNrs = async () => {
    if (!company) return;
    if (!isCompanyAdmin) {
      toast.error("Only Company Admins can disconnect NRS integration");
      return;
    }
    try {
      await disconnectCreds.mutateAsync();
      await update.mutateAsync({
        id: company.id,
        nrs_business_id: null,
        nrs_service_id: null,
        nrs_environment: "sandbox",
        nrs_sandbox_base_url: null,
        nrs_production_base_url: null,
      });

      setNrs({
        nrs_business_id: "",
        nrs_service_id: "",
        nrs_environment: "sandbox",
        nrs_sandbox_base_url: "",
        nrs_production_base_url: "",
      });
      setSecrets({ api_key: "", api_secret: "" });
      setCryptoText("");
      toast.success("NRS credentials removed");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to disconnect", { description: err.message });
    }
  };

  const readiness = !isCompanyAdmin ? "Read-only" : statusLoading ? "Incomplete" : credStatus?.ready ? "Ready" : "Incomplete";
  const busy = update.isPending || saveCreds.isPending || saveCrypto.isPending || disconnectCreds.isPending;
  const secretPlaceholder = (configured?: boolean) =>
    configured ? "Configured — leave blank to keep" : "Not configured";

  return (
    <div>
      <PageHeader title="Settings" description="Configure your company workspace." />
      <div className="p-6">
        <Tabs defaultValue="company" className="space-y-4">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="tax">Tax & Compliance</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="nrs">NRS Integration</TabsTrigger>
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
                <ToggleRow label="Auto-submit to NRS after approval" desc="Send approved invoices to NRS without manual click." />
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
            <Card className="p-6 shadow-elegant-sm bg-gradient-to-br from-card to-background border-border/80">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">NRS Integration</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Secure electronic invoice submission credentials for the Nigerian Revenue Service (NRS).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCompanyAdmin && (
                    <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs text-muted-foreground font-medium">
                      Read-only (Admin Required)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {readiness}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Loading configuration…
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* Corporate Tax Identity Card */}
                    <Card className="p-5 border-border bg-card/40 backdrop-blur-xs flex flex-col gap-4 shadow-elegant-xs">
                      <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase border-b border-border/40 pb-2 flex items-center gap-2">
                        <span className="h-2 w-1 bg-primary rounded-full"></span>
                        Corporate Tax Identity
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
                        API Gateway Settings
                      </h4>
                      
                      <div className="space-y-4">
                        <Field label="NRS Environment Mode">
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

                        <Field label="Sandbox Base URL">
                          <Input
                            value={nrs.nrs_sandbox_base_url}
                            onChange={(e) => setN("nrs_sandbox_base_url")(e.target.value)}
                            placeholder="https://eivc-k6z6d.ondigitalocean.app"
                            disabled={!isCompanyAdmin}
                          />
                        </Field>

                        {nrs.nrs_environment === "production" && (
                          <Field label="Production Base URL">
                            <Input
                              value={nrs.nrs_production_base_url}
                              onChange={(e) => setN("nrs_production_base_url")(e.target.value)}
                              placeholder="https://einvoice.nrs.gov.ng"
                              disabled={!isCompanyAdmin}
                            />
                          </Field>
                        )}
                      </div>
                    </Card>

                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* API Credentials Card */}
                    <Card className="p-5 border-border bg-card/40 backdrop-blur-xs flex flex-col gap-4 shadow-elegant-xs">
                      <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase border-b border-border/40 pb-2 flex items-center gap-2">
                        <span className="h-2 w-1 bg-primary rounded-full"></span>
                        API Access Credentials
                      </h4>
                      
                      <div className="space-y-4">
                        <Field label="NRS API Key">
                          <div className="relative flex items-center">
                            <Input
                              type={showApiKey ? "text" : "password"}
                              value={secrets.api_key}
                              onChange={(e) => setS("api_key")(e.target.value)}
                              placeholder={secretPlaceholder(credStatus?.api_key_configured)}
                              className="pl-9 pr-10 font-mono"
                              disabled={!isCompanyAdmin}
                            />
                            <Key className="absolute left-3 h-4 w-4 text-muted-foreground" />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                              disabled={!isCompanyAdmin}
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </Field>

                        <Field label="NRS API Secret">
                          <div className="relative flex items-center">
                            <Input
                              type={showApiSecret ? "text" : "password"}
                              value={secrets.api_secret}
                              onChange={(e) => setS("api_secret")(e.target.value)}
                              placeholder={secretPlaceholder(credStatus?.api_secret_configured)}
                              className="pl-9 pr-10 font-mono"
                              disabled={!isCompanyAdmin}
                            />
                            <Lock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                            <button
                              type="button"
                              onClick={() => setShowApiSecret(!showApiSecret)}
                              className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                              disabled={!isCompanyAdmin}
                            >
                              {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </Field>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-5 border-border bg-card/40 backdrop-blur-xs space-y-4 shadow-elegant-xs">
                    <div>
                      <h4 className="text-sm font-semibold tracking-wide uppercase">Taxpayer Cryptographic Configuration</h4>
                      <p className="mt-1 text-xs text-muted-foreground">Upload crypto_keys.txt or paste its JSON contents. The contents are sent securely and never displayed after saving.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="crypto_keys.txt">
                        <Input
                          type="file"
                          accept=".txt,.json,application/json,text/plain"
                          disabled={!isCompanyAdmin || saveCrypto.isPending}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (file) setCryptoText(await file.text());
                            event.currentTarget.value = "";
                          }}
                        />
                      </Field>
                      <Field label="JSON contents">
                        <Textarea value={cryptoText} onChange={(event) => setCryptoText(event.target.value)} disabled={!isCompanyAdmin} placeholder="Paste JSON contents" rows={4} />
                      </Field>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{credStatus?.crypto_configured ? "Configured" : "Not configured"}</span>
                      <span>{credStatus?.crypto_configured ? "Public key configured" : "Public key not configured"}</span>
                      <span>{credStatus?.crypto_configured ? "Certificate configured" : "Certificate not configured"}</span>
                      {credStatus?.crypto_verified_at && <span>Updated {new Date(credStatus.crypto_verified_at).toLocaleString()}</span>}
                    </div>
                    {isCompanyAdmin && (
                      <Button
                        variant="outline"
                        disabled={!cryptoText.trim() || saveCrypto.isPending}
                        onClick={async () => {
                          try {
                            await saveCrypto.mutateAsync(cryptoText);
                            setCryptoText("");
                            toast.success("Taxpayer cryptographic configuration saved");
                          } catch (e: unknown) {
                            toast.error("Failed to save cryptographic configuration", { description: (e as Error).message });
                          }
                        }}
                      >
                        {saveCrypto.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Save crypto configuration
                      </Button>
                    )}
                  </Card>

                  <Card className="p-4 border-border bg-muted/30 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Generate this in your NRS Developer Portal under 'API Credentials'</span>
                  </Card>

                  {/* Trust & Security / Actions Footer */}
                  <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-border/80 pt-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-2 rounded-lg border border-border/50 w-fit">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
                      <span>Credentials are encrypted end-to-end and stored securely.</span>
                    </div>

                    {isCompanyAdmin && (
                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        {credStatus && (
                          <Button
                            variant="destructive"
                            onClick={handleDisconnectNrs}
                            disabled={busy}
                            className="shadow-sm border border-destructive/20 hover:bg-destructive/90"
                          >
                            Remove NRS credentials
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (!company) return;
                            setNrs(nrsFromCompany());
                            setSecrets({ api_key: "", api_secret: "" });
                            setCryptoText("");
                          }}
                          disabled={busy}
                        >
                          Reset
                        </Button>
                        
                        <Button 
                          onClick={handleSaveNrs} 
                          disabled={busy}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all"
                        >
                          {busy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Save NRS settings
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
