import type { NrsCredentialStatus } from "@/integrations/supabase/nrsTypes";

// Tolerant, fail-closed adapter for nrs-credentials status metadata.
// Only allow-listed metadata keys are copied; every other field (especially raw
// secrets or crypto material) is dropped before reaching React Query's cache.

const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function parseCredentialStatus(value: unknown): NrsCredentialStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Credential status is unreadable. No configuration has been confirmed.");
  }
  const d = value as Record<string, unknown>;
  const result: NrsCredentialStatus = {
    environment: str(d.environment, 40),
    connection_status: str(d.connection_status, 60),
    api_key_configured: bool(d.api_key_configured),
    api_secret_configured: bool(d.api_secret_configured),
    taxpayer_password_configured: bool(d.taxpayer_password_configured),
    // Live name first, legacy `verified` as fallback.
    credentials_verified: bool(d.credentials_verified) ?? bool(d.verified),
    verified_at: str(d.verified_at, 60),
    crypto_configured: bool(d.crypto_configured),
    last_error: str(d.last_error),
  };
  if (result.api_key_configured === null && result.api_secret_configured === null && result.connection_status === null) {
    throw new Error("Credential status is incompatible with the available contract. Confirm the deployed function version.");
  }
  return result;
}

/** Signing readiness requires explicit server confirmation of credentials AND crypto. */
export function isSigningReady(s: NrsCredentialStatus | undefined): boolean {
  return Boolean(s && s.api_key_configured === true && s.api_secret_configured === true && s.crypto_configured === true);
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
