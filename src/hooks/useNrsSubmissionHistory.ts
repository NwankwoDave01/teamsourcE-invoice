import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAGE = 500;

/**
 * Read IDs only, never payloads/errors; RLS remains authoritative.
 *
 * nrs_submissions has no company_id column, so tenant scoping is resolved
 * through the company's own invoices: first load the company's invoice IDs,
 * then load submission rows whose invoice_id is in that set. Both queries are
 * fail-closed — any error throws and signing stays blocked.
 */
export async function readSubmissionHistory(companyId: string, invoiceId?: string): Promise<Set<string>> {
  // 1) Tenant-scoped invoice IDs (invoices.company_id is a real column).
  const invoiceIds: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase.from("invoices").select("id").eq("company_id", companyId);
    if (invoiceId) query = query.eq("id", invoiceId);
    const { data, error } = await query.order("id").range(offset, offset + PAGE - 1);
    if (error) throw new Error("Invoice list could not be checked. Signing is blocked.");
    for (const row of data ?? []) invoiceIds.push(row.id);
    if (!data || data.length < PAGE) break;
  }
  if (invoiceIds.length === 0) return new Set();

  // 2) Submission rows for those invoices, paged in batches of IDs.
  const ids = new Set<string>();
  for (let i = 0; i < invoiceIds.length; i += PAGE) {
    const batch = invoiceIds.slice(i, i + PAGE);
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from("nrs_submissions")
        .select("invoice_id")
        .in("invoice_id", batch)
        .order("id")
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error("Submission history could not be checked. Signing is blocked.");
      for (const row of data ?? []) ids.add(row.invoice_id);
      if (!data || data.length < PAGE) break;
    }
  }
  return ids;
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
