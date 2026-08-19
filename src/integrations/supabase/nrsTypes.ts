// Companion types for NRS columns/tables that the generated `types.ts`
// does not yet include (types.ts is auto-generated and must not be hand-edited).

export interface NrsCompanyExtra {
  nrs_entity_id: string | null;
  nrs_taxpayer_email: string | null;
}

export interface NrsCredentialStatus {
  api_key_configured: boolean;
  api_secret_configured: boolean;
  taxpayer_password_configured: boolean;
  verified: boolean;
  verified_at: string | null;
  last_error: string | null;
  environment: string;
}

export interface NrsVerifyResult extends NrsCredentialStatus {
  ok: boolean;
  message: string;
}
