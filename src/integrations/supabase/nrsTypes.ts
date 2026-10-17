// Companion types for NRS columns/tables that the generated `types.ts`
// does not yet include (types.ts is auto-generated and must not be hand-edited).

export interface NrsCompanyExtra {
  nrs_business_id: string | null;
  nrs_service_id: string | null;
  nrs_environment: string | null;
  nrs_sandbox_base_url: string | null;
  nrs_production_base_url: string | null;
}

export interface NrsCredentialStatus {
  environment: string;
  api_key_configured: boolean;
  api_secret_configured: boolean;
  taxpayer_password_configured: boolean;
  verified: boolean;
  verified_at: string | null;
  last_error: string | null;
}
