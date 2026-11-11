import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/shared/BrandMark";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";
import { registerBusiness, resendSignup, type RegistrationInput } from "@/lib/authSession";

export default function Signup() {
  const [form, setForm] = useState<Omit<RegistrationInput, "captchaToken">>({
    businessName: "", legalName: "", fullName: "", email: "", password: "", passwordConfirmation: "",
  });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaError, setCaptchaError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!captchaToken) { setCaptchaError("Complete the CAPTCHA before registering."); return; }
    if (form.businessName.trim().length < 2 || form.fullName.trim().length < 2) {
      setError("Enter your business name and full name (at least 2 characters each)."); return;
    }
    if (form.password.length < 12 || form.password.length > 128) {
      setError("Password must be between 12 and 128 characters long."); return;
    }
    if (form.password !== form.passwordConfirmation) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      setMessage(await registerBusiness({ ...form, captchaToken }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration is temporarily unavailable. Please try again.");
    } finally {
      setForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
      setLoading(false);
    }
  }

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!captchaToken) { setCaptchaError("Complete the CAPTCHA before resending."); return; }
    setLoading(true);
    try { setMessage(await resendSignup(form.email, captchaToken)); }
    catch (err) { setError(err instanceof Error ? err.message : "Confirmation resend is temporarily unavailable."); }
    finally {
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
      setLoading(false);
    }
  }

  const fields = [
    { name: "businessName", label: "Business name", max: 160, required: true, autoComplete: "organization" },
    { name: "legalName", label: "Legal name (optional)", max: 200, required: false, autoComplete: "off" },
    { name: "fullName", label: "Full name", max: 120, required: true, autoComplete: "name" },
    { name: "email", label: "Work email", max: 320, required: true, autoComplete: "email", type: "email" },
    { name: "password", label: "Password", max: 128, required: true, autoComplete: "new-password", type: "password" },
    { name: "passwordConfirmation", label: "Confirm password", max: 128, required: true, autoComplete: "new-password", type: "password" },
  ] as const;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <BrandMark variant="auth" size="md" subtitle="" />
        </Link>

        <Card className="space-y-4 p-8 shadow-elegant">
          {message ? <div className="space-y-4 text-center">
            <MailCheck className="mx-auto h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold">Check your email</h1>
            <p role="status" className="text-sm text-muted-foreground">{message}</p>
            <form onSubmit={handleResend} className="space-y-4 text-left">
              <Label htmlFor="resend-email">Work email</Label>
              <Input id="resend-email" type="email" required maxLength={320} value={form.email}
                disabled={loading} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <TurnstileCaptcha resetKey={captchaResetKey} onTokenChange={setCaptchaToken} onError={setCaptchaError} />
              {captchaError && <p role="alert" className="text-sm text-destructive">{captchaError}</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Resend confirmation
              </Button>
            </form>
            <Button asChild className="w-full"><Link to="/auth/login">Go to sign in</Link></Button>
          </div> : <>
            <h1 className="text-2xl font-semibold">Create a business account</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={loading} className="space-y-4">
                {fields.map((field) => <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input id={field.name} type={"type" in field ? field.type : "text"}
                    required={field.required} maxLength={field.max} autoComplete={field.autoComplete}
                    minLength={field.name === "password" || field.name === "passwordConfirmation" ? 12 : undefined}
                    value={form[field.name]} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} />
                </div>)}
                <TurnstileCaptcha resetKey={captchaResetKey} onTokenChange={setCaptchaToken} onError={setCaptchaError} />
                {captchaError && <p role="alert" className="text-sm text-destructive">{captchaError}</p>}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account
                </Button>
              </fieldset>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link>.
              Joining an existing company? Open your administrator’s invitation email.
            </p>
          </>}
        </Card>
      </div>
    </div>
  );
}
