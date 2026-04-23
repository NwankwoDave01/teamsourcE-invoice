import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
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
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Legal name"><Input defaultValue="Sahara Foods Ltd" /></Field>
                <Field label="Trading name"><Input defaultValue="Sahara Foods" /></Field>
                <Field label="TIN"><Input defaultValue="NG-12834521" /></Field>
                <Field label="RC Number"><Input defaultValue="RC-1184220" /></Field>
                <Field label="Email"><Input defaultValue="finance@saharafoods.ng" /></Field>
                <Field label="Phone"><Input defaultValue="+234 802 990 1100" /></Field>
                <div className="md:col-span-2">
                  <Field label="Registered address">
                    <Textarea rows={3} defaultValue="12 Marina Road, Lagos Island, Lagos, Nigeria" />
                  </Field>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save changes</Button>
              </div>
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
