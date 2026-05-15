import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export default function AdminSettings() {
  return (
    <div>
      <PageHeader title="Platform Settings" description={`Configure global behavior of the ${BRAND.name} platform.`} />
      <div className="p-6">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="connectors">NRS Connectors</TabsTrigger>
            <TabsTrigger value="billing">Billing & Plans</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-6 shadow-elegant-sm space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Platform name"><Input defaultValue={BRAND.name} /></Field>
                <Field label="Support email"><Input defaultValue={BRAND.supportEmail} /></Field>
                <Field label="Default region"><Input defaultValue="Nigeria — Lagos (af-west)" /></Field>
                <Field label="Timezone"><Input defaultValue="Africa/Lagos (UTC+1)" /></Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="p-6 shadow-elegant-sm space-y-3">
              <Toggle label="Enforce MFA for all super admins" defaultChecked />
              <Toggle label="Block sign-ins from outside Nigeria" />
              <Toggle label="Auto-rotate API keys every 90 days" defaultChecked />
              <Toggle label="Lock accounts after 5 failed attempts" defaultChecked />
            </Card>
          </TabsContent>

          {["connectors","billing","webhooks"].map((v) => (
            <TabsContent key={v} value={v}>
              <Card className="p-6 shadow-elegant-sm">
                <h3 className="text-base font-semibold capitalize">{v}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Configuration for {v}.</p>
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

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-4">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
