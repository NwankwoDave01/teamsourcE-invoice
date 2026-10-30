import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const tenantRoles = ["company_admin", "finance_officer", "staff_user"] as const;
export type TenantRole = typeof tenantRoles[number];
export const teamRoleLabels: Record<string, string> = {
  company_owner: "Company Owner", company_admin: "Company Admin", finance_officer: "Finance Officer", staff_user: "Staff User", super_admin: "Super Admin",
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

export interface ActiveCompanyMembership {
  companyId: string;
  name: string;
  plan: string;
  tin: string;
}

export async function loadActiveMemberships(uid: string): Promise<ActiveCompanyMembership[]> {
  const { data: memberships, error } = await supabase.from("company_members")
    .select("company_id").eq("user_id", uid).eq("status", "Active");
  if (error) throw error;
  const ids = [...new Set((memberships ?? []).map(({ company_id }) => company_id))];
  if (!ids.length) return [];

  const { data: companies, error: companiesError } = await supabase.from("companies")
    .select("id, name, plan, tin").in("id", ids).order("name");
  if (companiesError) throw companiesError;
  const companyById = new Map((companies ?? []).map((company) => [company.id, company]));
  return ids.map((companyId) => {
    const company = companyById.get(companyId);
    if (!company) throw new Error("An active company membership has no readable company record.");
    return {
      companyId,
      name: company.name,
      plan: company.plan,
      tin: company.tin,
    };
  });
}

export async function loadUserRoles(uid: string) {
  const { data: roleRows, error } = await supabase.from("user_roles")
    .select("role, company_id").eq("user_id", uid);
  if (error) throw error;
  return (roleRows ?? []).map((role) => ({
    role: role.role,
    companyId: role.company_id,
  }));
}

export interface InvitationDetails {
  companyName: string;
  companyId: string;
  role: string;
  email?: string;
  requiresPasswordSetup: boolean;
}

export interface InvitationStatus {
  invitations: InvitationDetails[];
  selectionRequired: boolean;
}

function parseInvitationDetails(data: Record<string, unknown>, email?: string): InvitationDetails {
  const companyId = typeof data.company_id === "string" ? data.company_id : "";
  if (!companyId) throw new Error("Invitation response did not include a company.");
  const companyName =
    (typeof data.company_name === "string" && data.company_name) ||
    (typeof (data.company as { name?: string })?.name === "string" && (data.company as { name: string }).name) ||
    (typeof data.companyName === "string" && data.companyName) ||
    "Inviting Company";
  return {
    companyName,
    companyId,
    role: typeof data.role === "string" ? data.role : "staff_user",
    email: typeof data.email === "string" ? data.email : email,
    requiresPasswordSetup: data.requires_password_setup === true,
  };
}

export async function fetchInvitationStatus(): Promise<InvitationStatus> {
  const data = (await invokeTenantAdmin({ action: "invitation_status" })) as Record<string, unknown>;
  if (data.pending !== true) throw new Error("No valid pending invitation was found for this verified email.");
  const email = typeof data.email === "string" ? data.email : undefined;
  if (data.selection_required === true) {
    if (!Array.isArray(data.invitations) || data.invitations.length < 2) {
      throw new Error("Invitation selection response is incomplete. Please refresh.");
    }
    return {
      invitations: data.invitations.map((candidate) => {
        if (!candidate || typeof candidate !== "object") {
          throw new Error("Invitation response is incompatible. Please refresh.");
        }
        return parseInvitationDetails(candidate as Record<string, unknown>, email);
      }),
      selectionRequired: true,
    };
  }
  return {
    invitations: [parseInvitationDetails(data, email)],
    selectionRequired: false,
  };
}

export async function acceptTenantInvitation(companyId: string): Promise<unknown> {
  if (!companyId) throw new Error("Choose a company invitation to accept.");
  return invokeTenantAdmin({ action: "accept_invitation", company_id: companyId });
}