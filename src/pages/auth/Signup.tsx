import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";
import { BrandMark } from "@/components/shared/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { registerAccount, verifySignup } from "@/lib/authSession";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const tokenHash = new URLSearchParams(location.search).get("token_hash");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!captchaToken) {
      setCaptchaError("Complete the CAPTCHA before creating your account.");
      return;
    }

    setSubmitting(true);
    try {
      await registerAccount(email.trim(), password, displayName.trim(), captchaToken);
      setVerificationSent(true);
      setPassword("");
      setConfirmPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration could not be completed.");
    } finally {
      setSubmitting(false);
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
    }
  };

  const handleVerify = async () => {
    if (!tokenHash || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await verifySignup(tokenHash);
      if (!user) throw new Error("Email verification did not establish a session.");
      const sessionUser = await refreshSession(true);
      if (!sessionUser) throw new Error("The verified session could not be confirmed.");
      setVerified(true);
      navigate("/app/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Email verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <BrandMark variant="auth" size="md" subtitle="" />
        </Link>

        <Card className="space-y-5 p-8 shadow-elegant">
          {tokenHash ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-2xl font-semibold">Verify your email</h1>
              <p className="text-sm text-muted-foreground">
                Continue to verify this email address. You can create or join a company after verification.
              </p>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={submitting || verified} onClick={() => void handleVerify()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {verified ? "Email verified" : "Continue"}
              </Button>
            </div>
          ) : verificationSent ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p role="status" className="text-sm text-muted-foreground">
                If this address can be registered, a verification email has been sent. Follow its link to continue.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/login">Go to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Create your account</h1>
                <p className="text-sm text-muted-foreground">Verify your email, then create or join a company workspace.</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="display-name">Full name</Label>
                  <Input id="display-name" autoComplete="name" maxLength={120} value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" required autoComplete="email" maxLength={254}
                    value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" required minLength={12} autoComplete="new-password"
                    value={password} onChange={(event) => setPassword(event.target.value)} />
                  <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input id="confirm-password" type="password" required minLength={12} autoComplete="new-password"
                    value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                </div>
                <TurnstileCaptcha resetKey={captchaResetKey} onTokenChange={setCaptchaToken} onError={setCaptchaError} />
                {captchaError && <p role="alert" className="text-sm text-destructive">{captchaError}</p>}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/auth/login">Sign in</Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
