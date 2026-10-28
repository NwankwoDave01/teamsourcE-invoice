import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BrandMark } from "@/components/shared/BrandMark";
import { BRAND } from "@/lib/brand";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";

const INDUSTRIES = [
  "Technology & Software",
  "Retail & E-commerce",
  "Professional Services",
  "Manufacturing",
  "Healthcare & Pharmaceuticals",
  "Construction & Real Estate",
  "Financial Services",
  "Hospitality & Tourism",
  "Other",
] as const;

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    companyName: "",
    tin: "",
    industry: "Technology & Software",
  });
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaError, setCaptchaError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast({ title: "Weak password", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (!captchaToken) {
      setCaptchaError("Complete the CAPTCHA before creating an account.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          captchaToken,
          data: {
            display_name: form.displayName.trim(),
            company_name: form.companyName.trim(),
            tin: form.tin.trim(),
            industry: form.industry.trim() || "Other",
          },
        },
      });
      if (error) {
        toast({ title: "Sign-up failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.session) {
        toast({ title: "Workspace created", description: `Welcome to ${BRAND.name}.` });
        navigate("/app/dashboard", { replace: true });
      } else {
        setSubmittedEmail(form.email.trim());
      }
    } catch (error) {
      toast({
        title: "Sign-up failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
    }
  };

  if (submittedEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center">
            <BrandMark variant="auth" size="md" subtitle="" />
          </Link>

          <Card className="p-8 shadow-elegant text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold">Verify your email</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We have sent a verification link to{" "}
              <span className="font-semibold text-foreground">{submittedEmail}</span>.
              Please check your inbox and verify your email to activate your company workspace.
            </p>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Didn't receive an email? Check your spam folder or sign in with your email once verified.
            </div>
            <div className="pt-2">
              <Button asChild className="w-full gap-2">
                <Link to="/auth/login">
                  <CheckCircle2 className="h-4 w-4" />
                  Proceed to Sign in
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <BrandMark variant="auth" size="md" subtitle="" />
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
                <Input
                  id="displayName"
                  required
                  value={form.displayName}
                  onChange={set("displayName")}
                  placeholder="e.g. Amaka Okafor"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@company.ng"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                />
                <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company workspace</p>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  required
                  value={form.companyName}
                  onChange={set("companyName")}
                  placeholder="e.g. Acme Nigeria Ltd"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tin">TIN</Label>
                  <Input
                    id="tin"
                    required
                    value={form.tin}
                    onChange={set("tin")}
                    placeholder="e.g. 12345678-0001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={form.industry}
                    onValueChange={(val) => setForm({ ...form, industry: val })}
                  >
                    <SelectTrigger id="industry" aria-label="Industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <TurnstileCaptcha
              resetKey={captchaResetKey}
              onTokenChange={setCaptchaToken}
              onError={setCaptchaError}
            />
            {captchaError && (
              <p role="alert" className="text-sm text-destructive">{captchaError}</p>
            )}
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