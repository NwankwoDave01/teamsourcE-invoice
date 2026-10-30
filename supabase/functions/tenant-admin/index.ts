import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://e-invoicing.teamsource.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const allowedRoles = new Set(["company_admin", "finance_officer", "staff_user"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok: false, error: "User management service is not configured" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: userResult, error: userError } = await userClient.auth.getUser();
    const actor = userResult?.user;
    if (userError || !actor?.id || !actor.email) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const companyId = typeof body.company_id === "string" ? body.company_id : "";
    const targetUserId = typeof body.user_id === "string" ? body.user_id : "";
    const isAcceptance = action === "accept_invitation";

    async function requireCompanyAdmin(id: string) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("A valid company is required");
      const { data, error } = await admin.rpc("can_manage_company", {
        _user_id: actor!.id,
        _company_id: id,
      });
      if (error) throw new Error("Unable to verify company administrator permission");
      if (!data) throw new Error("Forbidden: active company administrator permission required");
    }

    // Read-only invitation preflight. This never activates tenant access.
    if (action === "invitation_status") {
      if (!actor.invited_at) return json({ ok: true, pending: false });
      const { data: invitation, error: invitationError } = await admin
        .from("company_invitations")
        .select("id, company_id, role, expires_at")
        .eq("email", actor.email.toLowerCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (invitationError) throw invitationError;
      if (!invitation) return json({ ok: true, pending: false });
      const { data: membership, error: membershipError } = await admin
        .from("company_members")
        .select("status")
        .eq("company_id", invitation.company_id)
        .eq("user_id", actor.id)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership || membership.status !== "Invited") {
        return json({ ok: true, pending: false });
      }
      const { data: company, error: companyError } = await admin
        .from("companies")
        .select("name")
        .eq("id", invitation.company_id)
        .maybeSingle();
      if (companyError) throw companyError;
      return json({
        ok: true, pending: true,
        email: actor.email,
        company_name: company?.name ?? "your company",
        role: invitation.role,
        expires_at: invitation.expires_at,
      });
    }

    // Accept only a real Auth-invite account. The service-role RPC atomically activates
    // the invited membership and consumes the matching invitation in one transaction.
    if (isAcceptance) {
      if (!actor.invited_at) {
        return json({ ok: true, accepted: false, message: "No pending invitation" });
      }
      const { data, error } = await admin.rpc("tenant_admin_accept_invitation", {
        p_user_id: actor.id,
        p_email: actor.email.toLowerCase(),
      });
      if (error) {
        if (error.message.includes("does not have a valid invitation")) {
          return json({ ok: true, accepted: false, message: "No pending invitation" });
        }
        throw error;
      }
      return json(data);
    }

    if (!companyId) return json({ ok: false, error: "company_id is required" }, 400);
    await requireCompanyAdmin(companyId);

    if (action === "list") {
      const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
        admin.from("company_members").select("id, user_id, status, last_active_at, created_at")
          .eq("company_id", companyId).order("created_at", { ascending: true }),
        admin.from("company_invitations").select("id, email, role, status, created_at, expires_at")
          .eq("company_id", companyId).eq("status", "pending").order("created_at", { ascending: false }),
      ]);
      if (membersError) throw membersError;
      if (invitesError) throw invitesError;

      const roleRows = await admin.from("user_roles").select("user_id, role").eq("company_id", companyId);
      if (roleRows.error) throw roleRows.error;
      const profileRows = await admin.from("profiles").select("id, display_name")
        .in("id", (members ?? []).map(m => m.user_id));
      if (profileRows.error && members?.length) throw profileRows.error;

      const userCache = new Map<string, string | null>();
      for (const member of members ?? []) {
        const result = await admin.auth.admin.getUserById(member.user_id);
        userCache.set(member.user_id, result.data?.user?.email ?? null);
      }
      return json({
        ok: true,
        members: (members ?? []).map(m => ({
          ...m,
          email: userCache.get(m.user_id) ?? "",
          display_name: profileRows.data?.find(p => p.id === m.user_id)?.display_name ?? "",
          role: roleRows.data?.find(r => r.user_id === m.user_id)?.role ?? "staff_user",
        })),
        invitations: invites ?? [],
      });
    }

    if (action === "invite") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role = typeof body.role === "string" ? body.role : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 120) : "";
      if (!emailPattern.test(email) || email.length > 254) return json({ ok: false, error: "Enter a valid email address" }, 400);
      if (!allowedRoles.has(role)) return json({ ok: false, error: "Choose a supported company role" }, 400);
      // Expire stale invitations before enforcing one pending invite per email.
      const now = new Date().toISOString();
      const { error: expireError } = await admin.from("company_invitations")
        .update({ status: "revoked" }).eq("status", "pending").lte("expires_at", now);
      if (expireError) throw expireError;

      const { data: pendingInvitation, error: pendingError } = await admin
        .from("company_invitations").select("id, company_id")
        .eq("email", email).eq("status", "pending").gt("expires_at", now).maybeSingle();
      if (pendingError) throw pendingError;
      if (pendingInvitation) {
        return json({
          ok: false,
          error: pendingInvitation.company_id === companyId
            ? "A pending invitation already exists. Have the user accept it or revoke it before re-inviting."
            : "This email has a pending invitation for another company. Revoke it or have the user accept it first.",
        }, 409);
      }

      // Locate an existing auth identity. Current app resolves one active tenant per login;
      // do not silently attach a user already belonging to another tenant.
      let existingUser: { id: string; email?: string; invited_at?: string | null } | null = null;
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error("Could not check whether this email already has an account");
        existingUser = data.users.find(u => u.email?.toLowerCase() === email) as { id: string; email?: string; invited_at?: string | null } | undefined ?? null;
        if (existingUser || data.users.length < 1000) break;
      }

      if (existingUser) {
        const { data: memberships, error: existingError } = await admin
          .from("company_members").select("company_id, status")
          .eq("user_id", existingUser.id);
        if (existingError) throw existingError;
        if ((memberships ?? []).some(m => m.status === "Active" && m.company_id !== companyId)) {
          return json({ ok: false, error: "This account already belongs to another tenant. Use a separate login for this tenant." }, 409);
        }
        if (existingUser.invited_at && !(memberships ?? []).some(m => m.status === "Active")) {
          return json({ ok: false, error: "This account was created by an invitation and has not completed acceptance. The user must accept a valid invitation before access can be granted." }, 409);
        }
        if ((memberships ?? []).some(m => m.company_id === companyId && m.status === "Active")) {
          return json({ ok: false, error: "This person is already an active member of this company." }, 409);
        }
        // A user created by an invitation must not be made active by repeating
        // the invite action. Only the signed-in invite acceptance RPC may activate it.
        if ((memberships ?? []).some(m => m.company_id === companyId && m.status === "Invited")) {
          return json({
            ok: false,
            error: "This account already has a pending or incomplete invitation for this company. The user must accept the invitation before access can be activated.",
          }, 409);
        }

        const { error: memberError } = await admin.from("company_members").upsert({
          company_id: companyId, user_id: existingUser.id, status: "Active", last_active_at: new Date().toISOString(),
        }, { onConflict: "company_id,user_id" });
        if (memberError) throw memberError;
        const { error: deleteRoleError } = await admin.from("user_roles").delete()
          .eq("company_id", companyId).eq("user_id", existingUser.id);
        if (deleteRoleError) throw deleteRoleError;
        const { error: roleError } = await admin.from("user_roles").insert({
          company_id: companyId, user_id: existingUser.id, role,
        });
        if (roleError) throw roleError;
        return json({ ok: true, mode: "added_existing_user", message: "Existing account added to this company", user_id: existingUser.id });
      }

      // Bind Auth user creation to this server-initiated invitation. The random nonce
      // allows the auth.users trigger to distinguish this admin invite from self-signup.
      const invitationNonce = crypto.randomUUID();
      const { data: invitation, error: insertError } = await admin.from("company_invitations").insert({
        company_id: companyId, email, role, invited_by: actor.id, status: "pending",
        auth_invite_nonce: invitationNonce,
      }).select("id, email, role, expires_at").single();
      if (insertError) {
        if (insertError.code === "23505") return json({ ok: false, error: "A pending invitation already exists for this email." }, 409);
        throw insertError;
      }

      // This backend serves the production TS-Flow app. Invitations must always
      // return to its acceptance page, even when an administrator sends the invite
      // while testing the app locally. Never emit localhost or the old preview URL.
      const redirectTo = "https://e-invoicing.teamsource.net";
      const inviteDisplayName = displayName || email.split("@")[0];
      const { data: inviteData, error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo.replace(/\/+$/, "") + "/auth/accept-invite",
        data: {
          display_name: inviteDisplayName,
          tsflow_invitation_nonce: invitationNonce,
        },
      });
      if (sendError) {
        await admin.from("company_invitations").delete().eq("id", invitation.id);
        // Keep the actionable Auth error visible to the company admin; do not expose
        // request headers or credentials.
        return json({
          ok: false,
          error: `Invitation email could not be sent: ${sendError.message.slice(0, 300)}`,
        }, 502);
      }

      // The nonce is one-use for the auth.users insert only. Clear the database copy
      // after Auth succeeds, then best-effort remove the marker from user metadata.
      const { error: clearNonceError } = await admin.from("company_invitations")
        .update({ auth_invite_nonce: null }).eq("id", invitation.id);
      if (clearNonceError) console.error("Unable to clear invitation nonce", { invitationId: invitation.id });
      if (inviteData?.user?.id) {
        const { error: metadataError } = await admin.auth.admin.updateUserById(inviteData.user.id, {
          user_metadata: { display_name: inviteDisplayName },
        });
        if (metadataError) console.error("Unable to remove invitation marker from user metadata");
      }
      return json({ ok: true, mode: "invited", invitation, message: "Invitation email sent" }, 201);
    }

    if (action === "set_role") {
      if (!targetUserId) return json({ ok: false, error: "user_id is required" }, 400);
      const role = typeof body.role === "string" ? body.role : "";
      if (!allowedRoles.has(role)) return json({ ok: false, error: "Unsupported company role" }, 400);
      const { data, error } = await admin.rpc("tenant_admin_set_member_role", {
        p_actor_id: actor.id, p_company_id: companyId, p_target_user_id: targetUserId, p_role: role,
      });
      if (error) throw new Error(error.message.includes("last active company administrator")
        ? error.message : (error.message.includes("Forbidden") || error.message.includes("active member") || error.message.includes("Super-admin")
          ? error.message : "Role could not be updated"));
      return json({ ok: true, result: data });
    }

    if (action === "remove_member") {
      if (!targetUserId) return json({ ok: false, error: "user_id is required" }, 400);
      const { data, error } = await admin.rpc("tenant_admin_remove_member", {
        p_actor_id: actor.id, p_company_id: companyId, p_target_user_id: targetUserId,
      });
      if (error) throw new Error(error.message.includes("Forbidden") || error.message.includes("last active") ||
        error.message.includes("own company") || error.message.includes("Super-admin") ? error.message : "Member could not be removed");
      return json({ ok: true, result: data });
    }

    if (action === "revoke_invitation") {
      const invitationId = typeof body.invitation_id === "string" ? body.invitation_id : "";
      if (!/^[0-9a-f-]{36}$/i.test(invitationId)) return json({ ok: false, error: "A valid invitation is required" }, 400);
      const { data, error } = await admin.from("company_invitations")
        .update({ status: "revoked" }).eq("id", invitationId).eq("company_id", companyId)
        .eq("status", "pending").select("id").maybeSingle();
      if (error) throw error;
      if (!data) return json({ ok: false, error: "Pending invitation not found" }, 404);
      return json({ ok: true });
    }

    return json({ ok: false, error: "Unsupported action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "User management failed";
    const status = /Forbidden|permission|admin/i.test(message) ? 403 : 400;
    console.error("tenant-admin failed", { message });
    return json({ ok: false, error: message }, status);
  }
});