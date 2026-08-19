import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { NrsCredentialStatus, NrsVerifyResult } from "@/integrations/supabase/nrsTypes";

const FN = "nrs-credentials";

async function callFn<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FN, { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

/** Metadata only — never contains secret values. */
export function useNrsCredentialStatus() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["nrs-credential-status", companyId],
    enabled: !!companyId,
    queryFn: () => callFn<NrsCredentialStatus>({ action: "status" }),
  });
}

export function useSaveNrsCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { api_key?: string; api_secret?: string; taxpayer_password?: string }) =>
      callFn<NrsCredentialStatus>({ action: "save", ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nrs-credential-status"] }),
  });
}

export function useVerifyNrsConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callFn<NrsVerifyResult>({ action: "verify" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nrs-credential-status"] }),
  });
}

export function useDisconnectNrsCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callFn<NrsCredentialStatus>({ action: "disconnect" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nrs-credential-status"] }),
  });
}
