import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { recoverBusinessWorkspace } from "@/lib/authSession";
import { fetchInvitationStatus, type InvitationDetails } from "@/lib/tenantAdmin";
import { toast } from "sonner";
import { BrandMark } from "@/components/shared/BrandMark";

export default function CompanyOnboarding() {
  const { user, refreshMembership, signOut } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setCheckingInvitation(false);
      return;
    }
    fetchInvitationStatus()
      .then((details) => { if (!cancelled) setInvitation(details.pending ? details : null); })
      .catch(() => { if (!cancelled) setInvitation(null); })
      .finally(() => { if (!cancelled) setCheckingInvitation(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error("Business name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await recoverBusinessWorkspace({ businessName: name, city, state });
      await refreshMembership();
      toast.success("Workspace recovered. Add your taxpayer details in Company Settings before NRS submission.");
    } catch (error) {
      if (error && typeof error === "object" && "invitationPending" in error && error.invitationPending === true) {
        setInvitation({ pending: true, companyName: "your invited company", role: "staff_user", needsPasswordSetup: false });
      }
      toast.error("Workspace recovery failed", { description: error instanceof Error ? error.message : "Please retry." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandMark />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Workspace access</h1>
          <p className="text-sm text-muted-foreground">
            This signed-in account has no active company membership. Accept a pending invitation or use the secure workspace recovery form.
          </p>
        </div>

        <Card className="space-y-5 p-6 shadow-elegant-sm">
          {checkingInvitation ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking invitations…
            </div>
          ) : invitation ? (
            <div className="space-y-3 rounded-md border border-info/40 bg-info/10 p-4">
              <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" /> Pending invitation</div>
              <p className="text-sm text-muted-foreground">You have an invitation to join {invitation.companyName}. Your access remains inactive until you accept it.</p>
              <Button asChild className="w-full"><Link to="/auth/accept-invite">Review and accept invitation</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
                <p className="font-medium">Workspace recovery</p>
                <p className="mt-1 text-muted-foreground">The server will verify this account and create at most one workspace. A TIN is not required to get workspace access; enter taxpayer details later in Company Settings before using NRS submission.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name" className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Business name
                </Label>
                <Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-1.5 text-sm"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> City</Label>
                  <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={state} onChange={(event) => setState(event.target.value)} maxLength={120} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()} className="text-muted-foreground">Sign out</Button>
                <Button type="submit" disabled={saving} className="min-w-[160px] gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? "Recovering…" : "Recover workspace"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
