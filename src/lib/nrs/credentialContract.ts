import { z } from "zod";
import type { NrsCredentialStatus } from "@/integrations/supabase/nrsTypes";

// Match the checked-in nrs-credentials contract. Strip all unknown fields,
// especially raw values, before anything reaches React Query's metadata cache.
const statusSchema = z.object({
  environment: z.string().min(1),
  api_key_configured: z.boolean(),
  api_secret_configured: z.boolean(),
  taxpayer_password_configured: z.boolean(),
  verified: z.boolean(),
  verified_at: z.string().nullable(),
  last_error: z.string().nullable(),
});

export function parseCredentialStatus(value: unknown): NrsCredentialStatus {
  const result = statusSchema.safeParse(value);
  if (!result.success) throw new Error("Credential status is incompatible with the available contract. Confirm the deployed function version.");
  return result.data;
}

export function canAdministerCredentials(roles: readonly string[], companyId: string | null): boolean {
  return Boolean(companyId) && (roles.includes("company_admin") || roles.includes("super_admin"));
}

export function credentialSaveBody(input: { api_key: string; api_secret: string }) {
  const api_key = input.api_key.trim();
  const api_secret = input.api_secret.trim();
  if (!api_key || !api_secret || api_key.length > 4096 || api_secret.length > 4096) {
    throw new Error("Enter both API credentials, each no longer than 4096 characters.");
  }
  // Never spread caller input: company/user/environment IDs cannot cross this boundary.
  return { action: "save" as const, api_key, api_secret };
}