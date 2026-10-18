import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseSubmitResult, type SubmitResult } from "@/lib/nrs/submitContract";

/** Calls nrs-submit once and always refetches invoice state afterwards. */
export function useNrsSubmit() {
  const qc = useQueryClient();
  return async (invoiceId: string): Promise<SubmitResult> => {
    let result: SubmitResult;
    try {
      const { data, error } = await supabase.functions.invoke("nrs-submit", { body: { invoice_id: invoiceId } });
      result = parseSubmitResult(data, error);
    } catch (e) {
      result = parseSubmitResult(null, e ?? new Error("invoke failed"));
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["invoices"] }),
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }),
    ]);
    return result;
  };
}
