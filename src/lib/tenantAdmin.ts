import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const tenantRoles = ["company_admin", "finance_officer", "staff_user"] as const;
export type TenantRole = typeof tenantRoles[number];
export const teamRoleLabels: Record<string, string> = {
  company_admin: "Company Admin", finance_officer: "Finance Officer", staff_user: "Staff User", super_admin: "Super Admin",
};
const member = z.object({
  id: z.string(), user_id: z.string(), status: z.string(),
  last_active_at: z.string().nullable(), created_at: z.string(),
  email: z.string().nullable(), display_name: z.string().nullable(), role: z.string(),
});
const invitation = z.object({
  id: z.string(), email: z.string(), role: z.string(), status: z.string(),
  created_at: z.string(), expires_at: z.string().nullable(),
});
const teamSchema = z.object({ ok: z.literal(true), members: z.array(member), invitations: z.array(invitation) });
export type TeamMember = z.infer<typeof member>;
export type TeamInvitation = z.infer<typeof invitation>;
export type TeamData = z.infer<typeof teamSchema>;
export type TeamChange =
  | { action: "invite"; email: string; display_name: string; role: TenantRole }
  | { action: "set_role"; user_id: string; role: TenantRole }
  | { action: "remove_member"; user_id: string }
  | { action: "revoke_invitation"; invitation_id: string };

export async function invokeTenantAdmin(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("tenant-admin", { body });
  if (error) {
    let message = error.message || "Team request failed.";
    // Function HTTP errors can carry the actionable server error in their response.
    if (error.context instanceof Response) {
      try {
        const details: unknown = await error.context.clone().json();
        if (details && typeof details === "object" && "error" in details && typeof details.error === "string") message = details.error;
      } catch { /* Keep the transport error when no safe message is available. */ }
    }
    throw new Error(message);
  }
  if (!data || typeof data !== "object" || data.ok !== true) {
    throw new Error(typeof data?.error === "string" ? data.error : "Team request was not confirmed. Refresh before trying again.");
  }
  return data;
}

export function parseTeam(data: unknown): TeamData {
  const parsed = teamSchema.safeParse(data);
  if (!parsed.success) throw new Error("Team response is unavailable or incompatible. Please refresh.");
  return parsed.data;
}

export async function loadActiveMembership(uid: string) {
  const { data: membership, error } = await supabase.from("company_members")
    .select("company_id").eq("user_id", uid).eq("status", "Active").maybeSingle();
  if (error) throw error;
  const { data: roleRows, error: roleError } = await supabase.from("user_roles")
    .select("role, company_id").eq("user_id", uid);
  if (roleError) throw roleError;
  const companyId = membership?.company_id ?? null;
  return { companyId, roles: (roleRows ?? []).filter((r) => r.role === "super_admin" || (companyId && r.company_id === companyId)).map((r) => r.role) };
}