import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type AuditCategory = Database["public"]["Enums"]["audit_category"];

export async function recordAuditEvent(event: {
  company_id: string;
  action: string;
  category: AuditCategory;
  target?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>("audit-log", {
    body: event,
  });
  if (error || data?.ok !== true) {
    throw new Error("The audit event could not be recorded.");
  }
}
