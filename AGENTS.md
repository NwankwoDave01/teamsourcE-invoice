# Architecture rules

- Keep migration-evidenced missing client types in a frontend-only schema extension rather than editing generated types or changing runtime requests; this preserves managed files and existing backend behavior.

- Route tenant team reads and mutations through the authenticated tenant-admin contract using the active auth company; accept invitations explicitly via /auth/accept-invite (invitation_status, password set, accept_invitation) before reading Active-only membership, with stale-session guards and normal sign-in kept separate from auto-acceptance, so the server remains authoritative for access and roles.

- Keep taxpayer credential UI in a dedicated settings section with an explicit contract adapter that strips non-metadata response fields; this isolates secret handling from company identity updates and the non-secret APP draft.
- Credential requests must use the existing authenticated client with no client-supplied tenant identity or environment, and expose only actions supported by the confirmed deployed contract; server membership and authorization remain authoritative while external deployment access is unavailable.
- Re-key the credential section by authenticated user, active company, and saved environment, and scope metadata queries identically; this clears sensitive transient input when the context changes to match server-owned per-environment storage and block writes against an unsaved or mismatched environment.
- Route all nrs-submit calls through src/lib/nrs/submitContract.ts via useNrsSubmit; success requires data.ok === true and unconfirmed outcomes must block retry.
- Gate sandbox signing using fresh tenant-scoped invoice and submission-history reads plus a non-secret, user/company/invoice-scoped device marker written before invoking; existing history has no proven retry-safe semantics, and the backend remains the final cross-device/concurrency safeguard.
- Keep browser preflight in a frontend-owned validator limited to evidenced structural rules; older checked-in functions do not establish the deployed validation contract.
- Keep self-service registration in the cookie-authenticated server API: CAPTCHA is verified by Auth, confirmation is an explicit POST, redirect origins come from deployment-owned AUTH_SITE_URL, and a no-argument user-bound RPC provisions tenants only after confirmed email; this prevents browser-selected roles/tenants and scanner-consumed tokens.
- Treat unexpected registration/resend Auth failures as failures with code/status-only diagnostics, revoke incomplete confirmation sessions, and retain a fail-closed source draft until taxpayer-identity policy is approved; this prevents silent completion and invented taxpayer identities.
