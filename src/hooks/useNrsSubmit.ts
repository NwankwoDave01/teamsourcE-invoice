import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseSubmitResult, type SubmitResult } from "@/lib/nrs/submitContract";
import { useAuth } from "@/contexts/AuthContext";
import { readSubmissionHistory } from "@/hooks/useNrsSubmissionHistory";
import { hasDeviceAttempt, markDeviceAttempt, submissionBlockReason } from "@/lib/nrs/submissionSafety";

/** Calls nrs-submit once and always refetches invoice state afterwards. */
export function useNrsSubmit() {
  const qc = useQueryClient();
  const { user, companyId } = useAuth();
  return async (invoiceId: string): Promise<SubmitResult> => {
    let result: SubmitResult;
    try {
      if (!user || !companyId) throw new Error("An active company is required.");
      const { data: invoice, error: invoiceError } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("company_id", companyId).maybeSingle();
      if (invoiceError || !invoice) throw new Error("Invoice state could not be checked.");
      const history = await readSubmissionHistory(companyId, invoiceId);
      const blocked = submissionBlockReason(invoice, companyId, history, hasDeviceAttempt(user.id, companyId, invoiceId));
      if (blocked) return { kind: "unconfirmed", stage: null, retrySafe: false, message: blocked, details: null };
      markDeviceAttempt(user.id, companyId, invoiceId);
      const { data, error } = await supabase.functions.invoke("nrs-submit", { body: { invoice_id: invoiceId } });
      result = parseSubmitResult(data, error);
    } catch (e) {
      result = parseSubmitResult(null, e ?? new Error("invoke failed"));
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["invoices"] }),
      qc.invalidateQueries({ queryKey: ["invoice"] }),
      qc.invalidateQueries({ queryKey: ["nrs-submission-history"] }),
    ]);
    return result;
  };
}
