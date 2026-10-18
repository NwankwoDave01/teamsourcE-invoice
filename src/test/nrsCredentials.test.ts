import { describe, expect, it } from "vitest";
import { canAdministerCredentials, isSigningReady, credentialSaveBody, parseCredentialStatus } from "@/lib/nrs/credentialContract";

const metadata = {
  environment: "sandbox", api_key_configured: true, api_secret_configured: true,
  taxpayer_password_configured: false, verified: false, verified_at: null, last_error: null,
};

describe("tenant credential contract", () => {
  it("strips raw stored secrets from returned metadata", () => {
    const r = parseCredentialStatus({ ...metadata, api_key: "test-key", api_secret: "test-secret", public_key: "test-public", certificate: "test-cert" });
    expect(JSON.stringify(r)).not.toMatch(/test-key|test-secret|test-public|test-cert/);
    expect(r.api_key_configured).toBe(true);
    expect(r.credentials_verified).toBe(false);
  });
  it("reads live v13 fields and treats missing booleans as unknown", () => {
    const r = parseCredentialStatus({ environment: "sandbox", connection_status: "connected", credentials_verified: true, crypto_configured: false, api_key_configured: true, api_secret_configured: true });
    expect(r.connection_status).toBe("connected");
    expect(r.crypto_configured).toBe(false);
    expect(r.taxpayer_password_configured).toBeNull();
  });
  it("verification alone does not mean signing readiness", () => {
    const r = parseCredentialStatus({ ...metadata, credentials_verified: true });
    expect(isSigningReady(r)).toBe(false);
    expect(isSigningReady({ ...r, crypto_configured: true })).toBe(true);
  });
  it("never trusts a client-provided company ID for credential saves", () => {
    const input = { api_key: " test-key ", api_secret: " test-secret ", company_id: "wrong-tenant", environment: "production" };
    expect(credentialSaveBody(input)).toEqual({ action: "save", api_key: "test-key", api_secret: "test-secret" });
  });
  it("does not send a taxpayer portal password", () => {
    const input = { api_key: "test-key", api_secret: "test-secret", taxpayer_password: "test-password" };
    expect(credentialSaveBody(input)).not.toHaveProperty("taxpayer_password");
  });
  it("requires both taxpayer API values rather than global fallbacks", () => {
    expect(() => credentialSaveBody({ api_key: "", api_secret: "test-secret" })).toThrow();
    expect(() => credentialSaveBody({ api_key: "test-key", api_secret: "" })).toThrow();
  });
  it("rejects stale metadata shapes rather than assuming successful configuration", () => {
    expect(() => parseCredentialStatus({ ready: true, environment: "sandbox" })).toThrow();
  });
  it("role-gates security-sensitive actions to company administrators", () => {
    expect(canAdministerCredentials(["company_admin"], "company-a")).toBe(true);
    expect(canAdministerCredentials(["super_admin"], "company-a")).toBe(true);
    expect(canAdministerCredentials(["finance_officer"], "company-a")).toBe(false);
    expect(canAdministerCredentials(["staff_user"], "company-a")).toBe(false);
  });
  it("requires active membership even for a super admin", () => {
    expect(canAdministerCredentials(["super_admin"], null)).toBe(false);
  });
});