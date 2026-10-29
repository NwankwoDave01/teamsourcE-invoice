import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { getCurrentUser, updateAccountPassword, verifyInvitation } from "@/lib/authSession";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchInvitationStatus,
  acceptTenantInvitation,
  loadActiveMembership,
  teamRoleLabels,
  InvitationDetails,
} from "@/lib/tenantAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { BrandMark } from "@/components/shared/BrandMark";

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshMembership, refreshSession } = useAuth();

  const [loading, setLoading] = useState(true);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [pendingTokenHash, setPendingTokenHash] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Guard to ensure token_hash is never verified twice
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);

      // Check search parameters for error or token_hash
      const searchString = location.search || (typeof window !== "undefined" ? window.location.search : "");
      const hashString = location.hash || (typeof window !== "undefined" ? window.location.hash : "");

      const searchParams = new URLSearchParams(searchString);
      const urlError = searchParams.get("error_description") || searchParams.get("error");
      if (urlError) {
        if (!cancelled) {
          setError(urlError);
          setLoading(false);
        }
        return;
      }

      // Check hash fragment for errors
      if (hashString) {
        const hashParams = new URLSearchParams(hashString.startsWith("#") ? hashString.substring(1) : hashString);
        const hashError = hashParams.get("error_description") || hashParams.get("error");
        if (hashError) {
          if (!cancelled) {
            setError(hashError);
            setLoading(false);
          }
          return;
        }
      }

      const tokenHash = searchParams.get("token_hash");
      if (tokenHash) {
        // Never verify token automatically on page load to protect against email security scanners.
        // Instead, show the manual "Continue to accept invitation" button.
        if (!cancelled) {
          setPendingTokenHash(tokenHash);
          setAwaitingVerification(true);
          setLoading(false);
        }
        return;
      }

      // If no token_hash is present, check if a session already exists
      let user;
      try {
        user = await getCurrentUser();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Session validation failed.");
          setLoading(false);
        }
        return;
      }
      if (user) {
        try {
          const details = await fetchInvitationStatus();
          if (!cancelled) {
            setInvitation({
              companyName: details.companyName,
              role: details.role,
              email: details.email || user.email || undefined,
            });
            setLoading(false);
          }
        } catch (err: unknown) {
          if (!cancelled) {
            const msg = err instanceof Error ? err.message : "Failed to load invitation details.";
            setError(msg);
            setLoading(false);
          }
        }
        return;
      }

      // If no token and no session
      if (!cancelled) {
        setError("No active invitation detected. Please open the invitation link from your email.");
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.search]);

  // Called only when the user explicitly clicks "Continue to accept invitation"
  const handleVerifyOtp = async () => {
    if (!pendingTokenHash || hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;
    setVerifying(true);
    setError(null);

    try {
      const user = await verifyInvitation(pendingTokenHash);
      if (!user) throw new Error("Invitation session could not be established. The link may have expired.");
      const verifiedSession = await refreshSession(true);
      if (!verifiedSession) throw new Error("Invitation session could not be verified. Please reopen the invitation link.");

      // Session established; now fetch company and role
      const details = await fetchInvitationStatus();
      setInvitation({
        companyName: details.companyName,
        role: details.role,
        email: details.email || user.email || undefined,
      });
      setAwaitingVerification(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to verify invitation token.";
      setError(msg);
      setAwaitingVerification(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update user password
      await updateAccountPassword(password);

      // 2. Call accept_invitation via tenant-admin contract
      await acceptTenantInvitation();

      // 3. Reload active membership in auth context
      await refreshMembership();

      // 4. Verify active membership before entering dashboard
      const user = await getCurrentUser();
      if (user) {
        const membership = await loadActiveMembership(user.id);
        if (!membership.companyId) {
          throw new Error("Active company membership was not confirmed by the server.");
        }
      }

      toast({
        title: "Invitation accepted",
        description: `Welcome to ${invitation?.companyName ?? "your company"}.`,
      });

      // 5. Open workspace only after successful acceptance and verified membership
      navigate("/app/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invitation. Please try again.";
      setError(msg);
      toast({
        title: "Acceptance failed",
        description: msg,
        variant: "destructive",
      });
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

        <Card className="p-8 shadow-elegant">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking invitation link…</p>
            </div>
          ) : error && !invitation ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth/login">Return to Sign in</Link>
                </Button>
              </div>
            </div>
          ) : awaitingVerification ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Workspace invitation</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You have been invited to join a company workspace on TeamSource. Click the button below to accept your invitation and configure your account.
                </p>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive text-left">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  className="w-full gap-2"
                  disabled={verifying}
                  onClick={handleVerifyOtp}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {verifying ? "Verifying invitation…" : "Continue to accept invitation"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clicking above confirms your invitation link and prevents email security scanners from consuming your one-time token.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-semibold">Set up your account</h1>
                <p className="text-sm text-muted-foreground">
                  You are joining <span className="font-semibold text-foreground">{invitation?.companyName}</span>.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {teamRoleLabels[invitation?.role ?? "staff_user"] ?? invitation?.role}
                  </Badge>
                  {invitation?.email && (
                    <span className="text-xs text-muted-foreground">({invitation.email})</span>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Set password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 12 characters"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {submitting ? "Accepting invitation…" : "Set password & accept invitation"}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground pt-2">
                Already have an account?{" "}
                <Link to="/auth/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
