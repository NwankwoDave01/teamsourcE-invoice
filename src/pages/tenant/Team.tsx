import { useState } from "react";
import { Loader2, Plus, Search, Trash2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeam, useInviteTeamMember, useSetTeamRole, useRemoveTeamMember, useRevokeTeamInvitation } from "@/hooks/useCompanyData";
import { useAuth } from "@/contexts/AuthContext";
import { tenantRoles, teamRoleLabels, type TenantRole } from "@/lib/tenantAdmin";
import { toast } from "sonner";

function RoleSelect({ value, onChange, disabled, label }: { value: string; onChange: (value: TenantRole) => void; disabled?: boolean; label: string }) {
  return <Select value={value} onValueChange={(next) => { if (tenantRoles.some((role) => role === next)) onChange(next as TenantRole); }} disabled={disabled}>
    <SelectTrigger aria-label={label} className="w-full min-w-[160px]"><SelectValue /></SelectTrigger>
    <SelectContent>{tenantRoles.map((role) => <SelectItem key={role} value={role}>{teamRoleLabels[role]}</SelectItem>)}</SelectContent>
  </Select>;
}
const dateLabel = (value: string | null) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function Team() {
  const { companyId, user, roles, isSuperAdmin } = useAuth();
  // Reset dialogs and form state when the authenticated tenant changes.
  return <TeamContent key={`${user?.id}:${companyId}`} canManage={!!companyId && (isSuperAdmin || roles.includes("company_owner") || roles.includes("company_admin"))} />;
}

function TeamContent({ canManage }: { canManage: boolean }) {
  const team = useTeam();
  const invite = useInviteTeamMember();
  const setRole = useSetTeamRole();
  const remove = useRemoveTeamMember();
  const revoke = useRevokeTeamInvitation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setInviteRole] = useState<TenantRole>("staff_user");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ kind: "member" | "invitation"; id: string; name: string } | null>(null);
  const busy = invite.isPending || setRole.isPending || remove.isPending || revoke.isPending;
  const members = (team.data?.members ?? []).filter((m) => `${m.email ?? ""} ${m.display_name ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const invitations = team.data?.invitations ?? [];
  const reportError = (cause: unknown) => {
    const message = cause instanceof Error ? cause.message : "Team change failed. Please refresh and try again.";
    setError(message); toast.error(message);
  };
  const changeRole = async (userId: string, next: TenantRole) => {
    setError(null);
    try { await setRole.mutateAsync({ user_id: userId, role: next }); toast.success("Member role updated."); } catch (cause) { reportError(cause); }
  };
  const confirmRemoval = async () => {
    if (!confirmation) return;
    setError(null);
    try {
      if (confirmation.kind === "member") await remove.mutateAsync({ user_id: confirmation.id });
      else await revoke.mutateAsync({ invitation_id: confirmation.id });
      toast.success(confirmation.kind === "member" ? "Member access removed." : "Invitation revoked.");
      setConfirmation(null);
    } catch (cause) { reportError(cause); }
  };
  const errorNotice = error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null;

  return <div>
    <PageHeader title="Team" description="Manage users and their access roles." actions={canManage ? <Button size="sm" className="gap-1.5" disabled={busy || team.isFetching} onClick={() => { setError(null); setInviteOpen(true); }}><Plus className="h-4 w-4" />Invite member</Button> : undefined} />
    <div className="space-y-4 p-6">
      {!canManage ? <p className="text-sm text-muted-foreground">Only active company owners and admins can manage the team.</p> : <>
        {errorNotice}
        <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search team members" placeholder="Search team members" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        {team.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{team.error.message}</p><Button variant="outline" onClick={() => void team.refetch()}>Refresh team</Button></div> : team.isLoading ? <p className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading team…</p> : <>
          <Card className="overflow-hidden shadow-elegant-sm">
            {members.length === 0 ? <div className="flex flex-col items-center gap-3 p-8"><UserCog className="h-5 w-5 text-muted-foreground" /><p className="text-sm">No matching team members</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground"><tr>{["Member", "Role", "Status", "Last active", "Actions"].map((heading) => <th key={heading} className="px-5 py-3 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody>{members.map((m) => <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-secondary text-xs">{(m.display_name || m.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium">{m.display_name || m.email || "Unnamed member"}</p><p className="break-all text-muted-foreground">{m.email || "Email unavailable"}</p></div></div></td>
                <td className="px-5 py-3">{tenantRoles.some((r) => r === m.role) && m.status === "Active" ? <RoleSelect value={m.role} onChange={(next) => void changeRole(m.user_id, next)} disabled={busy || team.isFetching} label={`Role for ${m.email || m.display_name}`} /> : <Badge variant="secondary">{teamRoleLabels[m.role] ?? m.role}</Badge>}</td>
                <td className="px-5 py-3"><Badge variant="secondary">{m.status}</Badge></td><td className="px-5 py-3 text-muted-foreground">{dateLabel(m.last_active_at)}</td>
                <td className="px-5 py-3"><Button variant="ghost" size="sm" className="gap-1.5 text-destructive" disabled={busy || team.isFetching || m.status === "Disabled" || m.role === "company_owner"} title={m.role === "company_owner" ? "Transfer ownership before removing this member." : undefined} onClick={() => { setError(null); setConfirmation({ kind: "member", id: m.user_id, name: m.email || m.display_name || "this member" }); }}><Trash2 className="h-4 w-4" />Remove</Button></td>
              </tr>)}</tbody>
            </table></div>}
          </Card>
          <h2 className="text-base font-semibold">Invitations</h2>
          {invitations.length === 0 ? <p className="text-sm text-muted-foreground">No invitations</p> : <div className="divide-y divide-border">{invitations.map((i) => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-all text-sm font-medium">{i.email}</p><p className="text-sm text-muted-foreground">{teamRoleLabels[i.role] ?? i.role} · {i.status} · Expires {dateLabel(i.expires_at)}</p></div>{["pending", "invited"].includes(i.status.toLowerCase()) && <Button variant="outline" size="sm" disabled={busy || team.isFetching} onClick={() => { setError(null); setConfirmation({ kind: "invitation", id: i.id, name: i.email }); }}>Revoke invitation</Button>}</div>)}</div>}
        </>}
      </>}
    </div>
    <Dialog open={canManage && inviteOpen} onOpenChange={(open) => { if (!busy) setInviteOpen(open); }}><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg"><DialogHeader><DialogTitle>Invite member</DialogTitle><DialogDescription>Invite a teammate to this company.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setError(null);
        try { await invite.mutateAsync({ email: email.trim(), display_name: displayName.trim(), role }); toast.success("Invitation request completed. New accounts receive an invitation email; existing eligible users are added."); setEmail(""); setDisplayName(""); setInviteRole("staff_user"); setInviteOpen(false); } catch (cause) { reportError(cause); }
      }}>
        <div className="space-y-2"><Label htmlFor="team-email">Email</Label><Input id="team-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="team-name">Display name</Label><Input id="team-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={busy} /></div>
        <div className="space-y-2"><Label>Role</Label><RoleSelect value={role} onChange={setInviteRole} disabled={busy} label="Invitation role" /></div>{errorNotice}
        <DialogFooter><Button variant="outline" type="button" disabled={busy} onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send invitation</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Dialog open={canManage && !!confirmation} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg"><DialogHeader><DialogTitle>{confirmation?.kind === "member" ? "Remove member access?" : "Revoke invitation?"}</DialogTitle><DialogDescription className="break-all">{confirmation?.name} will no longer have {confirmation?.kind === "member" ? "access to this company" : "access through this invitation"}.</DialogDescription></DialogHeader>{errorNotice}<DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void confirmRemoval()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm {confirmation?.kind === "member" ? "removal" : "revocation"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
