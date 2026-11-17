import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithPassword } from "@/lib/authSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { BrandMark } from "@/components/shared/BrandMark";
import { BRAND } from "@/lib/brand";

import { useAuth } from "@/contexts/AuthContext";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, refreshSession } = useAuth();
  const noMembership = (location.state as { reason?: string } | null)?.reason === "no_active_membership";
  const from = (location.state as { from?: string } | null)?.from ?? "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaError, setCaptchaError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setCaptchaError("Complete the CAPTCHA before signing in.");
      return;
    }

    setLoading(true);
    let verifyingSession = false;
    try {
      const signedInUser = await signInWithPassword(email, password, captchaToken);
      if (!signedInUser) throw new Error("Sign-in did not establish a session.");
      verifyingSession = true;
      const verifiedSession = await refreshSession(true);
      if (!verifiedSession) throw new Error("The new session could not be verified.");
      navigate(from, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      const normalizedMessage = message.toLowerCase();
      const title = verifyingSession
        ? "Session verification failed"
        : /captcha|turnstile/.test(normalizedMessage)
          ? "CAPTCHA verification failed"
          : /invalid.*(credential|password)|credential.*invalid/.test(normalizedMessage)
            ? "Invalid credentials"
            : "Sign-in failed";
      toast({
        title,
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <BrandMark variant="auth" size="md" subtitle="" />
        </Link>

        <Card className="p-8 shadow-elegant">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
          </div>

          {noMembership && (
            <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-medium">No active company workspace</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your account is not currently an active member of any company workspace. If you received an invitation email, please click the link in your email to accept your invitation.
              </p>
              {user && (
                <div className="mt-3 flex items-center justify-between border-t border-amber-500/20 pt-2">
                  <span className="text-xs text-muted-foreground">Signed in as {user.email}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={async () => {
                      await signOut();
                      toast({ title: "Signed out" });
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.ng" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password"
                  className="pr-12" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </Button>
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
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to {BRAND.name}?{" "}
            <Link to="/auth/signup" className="font-medium text-primary hover:underline">Create a business account</Link>.
            Joining an existing company? Use the invitation link from your administrator.
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Enterprise e-invoicing for Nigerian businesses
        </p>
      </div>
    </div>
  );
}