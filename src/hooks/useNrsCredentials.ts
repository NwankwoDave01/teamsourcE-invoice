import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canAdministerCredentials, credentialSaveBody, parseCredentialStatus } from "@/lib/nrs/credentialContract";

const FN = "nrs-credentials";

async function callFn(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(FN, { body });
  if (error) throw new Error("Credential service unavailable or access denied. Check your active company membership and try again.");
  if (data && typeof data === "object" && "error" in data) {
    throw new Error("The credential service could not complete this request. No success has been confirmed.");
  }
  return parseCredentialStatus(data);
}

/** Metadata only — never contains secret values. */
export function useNrsCredentialStatus(environment: string) {
  const { user, companyId } = useAuth();
  return useQuery({
    queryKey: ["nrs-credential-status", user?.id, companyId, environment],
    enabled: Boolean(user && companyId),
    queryFn: () => callFn({ action: "status" }),
    retry: false,
  });
}

export function useSaveNrsCredentials() {
  const qc = useQueryClient();
  const { user, companyId, roles } = useAuth();
  return useMutation({
    mutationFn: async (input: { api_key: string; api_secret: string }) => {
      if (!user || !canAdministerCredentials(roles, companyId)) throw new Error("An active company administrator is required.");
      return callFn(credentialSaveBody(input));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nrs-credential-status", user?.id, companyId] }),
    // React Query otherwise retains mutation variables containing raw credentials.
    gcTime: 0,
  });
}

export function useDisconnectNrsCredentials() {
  const qc = useQueryClient();
  const { user, companyId, roles } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user || !canAdministerCredentials(roles, companyId)) throw new Error("An active company administrator is required.");
      return callFn({ action: "disconnect" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nrs-credential-status", user?.id, companyId] }),
  });
}
