// Companion types for NRS columns/tables that the generated `types.ts`
// does not yet include (types.ts is auto-generated and must not be hand-edited).

export interface NrsCompanyExtra {
  nrs_business_id: string | null;
  nrs_service_id: string | null;
  nrs_environment: string | null;
  nrs_sandbox_base_url: string | null;
  nrs_production_base_url: string | null;
}

/**
 * Metadata-only credential status. Accepts both the checked-in legacy shape and
 * the newer live shape (connection_status, credentials_verified, crypto_configured).
 * A field the server did not return is `null` (unknown), never assumed true.
 */
export interface NrsCredentialStatus {
  environment: string | null;
  connection_status: string | null;
  api_key_configured: boolean | null;
  api_secret_configured: boolean | null;
  taxpayer_password_configured: boolean | null;
  credentials_verified: boolean | null;
  verified_at: string | null;
  crypto_configured: boolean | null;
  crypto_status: string | null;
  crypto_validation_error: string | null;
  crypto_verified_at: string | null;
  last_error: string | null;
}
