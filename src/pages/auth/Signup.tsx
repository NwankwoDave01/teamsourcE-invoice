import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    companyName: "",
    tin: "",
    industry: "Other",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast({ title: "Weak password", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
        data: {
          display_name: form.displayName,
          company_name: form.companyName,
          tin: form.tin,
          industry: form.industry,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign-up failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Workspace created", description: "Welcome to Vexa." });
    navigate("/app/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-elegant-md">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Vexa</span>
        </Link>

        <Card className="p-8 shadow-elegant">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold">Create your workspace</h1>
            <p className="text-sm text-muted-foreground">
              Start invoicing in minutes. You'll be the Company Admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="displayName">Your full name</Label>
                <Input id="displayName" required value={form.displayName} onChange={set("displayName")} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" required autoComplete="email"
                  value={form.email} onChange={set("email")} placeholder="you@company.ng" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} autoComplete="new-password"
                  value={form.password} onChange={set("password")} />
                <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company workspace</p>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" required value={form.companyName} onChange={set("companyName")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tin">TIN</Label>
                  <Input id="tin" required value={form.tin} onChange={set("tin")} placeholder="NG-12345678" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={form.industry} onChange={set("industry")} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create workspace
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}