import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NRSResource {
  code: string;
  label: string;
  metadata?: Record<string, unknown> | null;
}

export function useNrsMasterData(resourceType: string) {
  return useQuery<NRSResource[]>({
    queryKey: ["nrs-master-data", resourceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nrs_master_data")
        .select("code, label, metadata")
        .eq("resource_type", resourceType)
        .order("label");

      if (error) {
        throw error;
      }

      return (data ?? []).map((item) => ({
        code: item.code,
        label: item.label,
        metadata: item.metadata as Record<string, unknown> | null,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
}
