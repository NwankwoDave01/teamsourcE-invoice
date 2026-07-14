import { useState } from "react";
import { Building2, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BrandMark } from "@/components/shared/BrandMark";

export default function CompanyOnboarding() {
  const { user, refreshMembership, signOut } = useAuth();
  const [name, setName] = useState("");
  const [tin, setTin] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    setSaving(true);
    try {
      const { data: company, error: cErr } = await supabase
        .from("companies")
        .insert({
          name: name.trim(),
          tin: tin.trim() || "NG-PENDING",
          industry: "Other",
          plan: "Starter",
          status: "Trial",
          city: city.trim() || null,
          state: state.trim() || null,
          country_code: "NG",
          created_by: user.id,
        } as never)
        .select()
        .single();
      if (cErr) throw cErr;

      const [{ error: mErr }, { error: rErr }] = await Promise.all([
        supabase.from("company_members").insert({
          company_id: company.id,
          user_id: user.id,
          status: "Active",
          last_active_at: new Date().toISOString(),
        } as never),
        supabase.from("user_roles").insert({
          user_id: user.id,
          company_id: company.id,
          role: "company_admin",
        } as never),
      ]);
      if (mErr) throw mErr;
      if (rErr) throw rErr;

      toast.success("Workspace created");
      await refreshMembership();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Failed to create workspace", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandMark />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="text-sm text-muted-foreground">
            Tell us about your business so we can generate compliant invoices under your name.
          </p>
        </div>

        <Card className="p-6 shadow-elegant-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="business-name" className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Business name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="business-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adeola Ventures Ltd"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tin" className="flex items-center gap-1.5 text-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Tax Identification Number (TIN)
              </Label>
              <Input
                id="tin"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                placeholder="e.g. NG-44192011"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                You can add or update this later from Settings.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  City
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lagos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Lagos"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground"
              >
                Sign out
              </Button>
              <Button type="submit" disabled={saving} className="min-w-[160px] gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Creating…" : "Create workspace"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}