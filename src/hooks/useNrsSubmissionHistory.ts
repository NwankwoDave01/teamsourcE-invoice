import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Read IDs only, never payloads/errors; RLS remains authoritative. */
export async function readSubmissionHistory(companyId: string, invoiceId?: string): Promise<Set<string>> {
  let query = supabase.from("nrs_submissions")
    .select("invoice_id,invoices!inner(company_id)")
    .eq("invoices.company_id", companyId);
  if (invoiceId) query = query.eq("invoice_id", invoiceId);
  const ids = new Set<string>();
  // Paginate to avoid silently treating history beyond the response cap as absent.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.order("id").range(offset, offset + 499);
    if (error) throw new Error("Submission history could not be checked. Signing is blocked.");
    for (const row of data ?? []) ids.add(row.invoice_id);
    if (!data || data.length < 500) return ids;
  }
}

export function useNrsSubmissionHistory() {
  const { user, companyId } = useAuth();
  return useQuery({
    queryKey: ["nrs-submission-history", user?.id, companyId],
    enabled: Boolean(user && companyId),
    retry: false,
    refetchOnMount: "always",
    queryFn: () => {
      if (!user || !companyId) throw new Error("An active company is required.");
      return readSubmissionHistory(companyId);
    },
  });
}