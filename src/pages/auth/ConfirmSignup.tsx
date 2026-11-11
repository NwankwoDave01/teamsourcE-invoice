import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/shared/BrandMark";
import { confirmSignup } from "@/lib/authSession";
import { loadActiveMembership } from "@/lib/tenantAdmin";
import { useAuth } from "@/contexts/AuthContext";

export default function ConfirmSignup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  // No automatic verification on render: email scanners cannot consume the token.
  const [tokenHash, setTokenHash] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("type") === "email" ? params.get("token_hash") : null;
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const attempted = useRef(false);

  async function handleConfirm() {
    if (!tokenHash || attempted.current) return;
    attempted.current = true;
    setLoading(true);
    setError("");
    const token = tokenHash;
    setTokenHash(null);
    // Remove the one-time credential from the address bar/history once used.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    try {
      const confirmed = await confirmSignup(token);
      if (!confirmed) throw new Error("The confirmation session could not be established. Sign in to retry.");
      const session = await refreshSession(true);
      if (!session || session.id !== confirmed.id) throw new Error("The confirmed session could not be verified. Sign in to retry.");
      const membership = await loadActiveMembership(session.id);
      if (!membership.companyId) throw new Error("Active workspace access could not be confirmed. Sign in to retry.");
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed. Sign in to retry.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-6 flex items-center justify-center"><BrandMark variant="auth" size="md" subtitle="" /></Link>
      <Card className="space-y-4 p-8 text-center shadow-elegant">
        <MailCheck className="mx-auto h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold">Confirm your email</h1>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p>
          : <p className="text-sm text-muted-foreground">{tokenHash || loading ? "Confirm your email to activate your business workspace." : "Open the confirmation link from your email. If your email is already confirmed, sign in to finish setup."}</p>}
        {(tokenHash || loading) && <Button onClick={handleConfirm} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm email
        </Button>}
        <Button asChild variant="outline" className="w-full"><Link to="/auth/login">Go to sign in</Link></Button>
        <Link to="/auth/signup" className="block text-sm text-primary hover:underline">Register or request a new confirmation email</Link>
      </Card>
    </div>
  </div>;
}