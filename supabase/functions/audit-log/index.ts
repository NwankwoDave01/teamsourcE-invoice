import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createAuditLogHandler } from "../_shared/auditLogHandler.ts";

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Audit logging service is not configured");
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

const handler = createAuditLogHandler({
  authenticate: async (token) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) throw new Error("Authentication service is not configured");

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await userClient.auth.getUser(token);
    if (error) {
      if (error.status === 401) return null;
      throw error;
    }
    return data.user?.id ?? null;
  },
  isActiveMember: async (userId, companyId) => {
    const { data, error } = await getAdminClient()
      .from("company_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("status", "Active")
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },
  getActorName: async (userId) => {
    const { data, error } = await getAdminClient()
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.display_name ?? null;
  },
  insert: async (record) => {
    const { error } = await getAdminClient().from("audit_logs").insert(record);
    if (error) throw error;
  },
});

Deno.serve(handler);
