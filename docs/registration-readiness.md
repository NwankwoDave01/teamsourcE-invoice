# Public business registration — source review only

**Migration NOT READY. No SQL has been run. Public signup must remain OFF; email confirmation must remain ON.**

## Source evidence and exact blockers

- `20260425200257_77893d59-9b77-49c9-b0ae-4674118e9dd3.sql` defines `companies.tin TEXT NOT NULL` without a default. Registration deliberately does not collect TIN. No new-business TIN policy is approved. The draft now raises **before every provisioning write**; its subsequent company insert is intentionally unreachable/incomplete until this blocker is resolved. No fabricated TIN is inserted.
- That migration evidences company UUID defaults, name, created_by, plan/status defaults (`Starter`/`Trial`), profile display_name, membership columns and `(company_id,user_id)` uniqueness, role columns and `(user_id,company_id,role)` uniqueness, and enum labels `Active`, `Invited`, `company_admin`. `20260428120000_nrs_einvoicing_layer.sql` evidences company legal_name/email. These historical files are not a current catalog snapshot.
- There is **no complete CREATE TABLE source for company_invitations** in this project. Later source references id/company_id/email/role/status/created_at/expires_at; `20261021114304_secure_invitation_signup_trigger_nonce.sql` adds auth_invite_nonce. Full column definitions, types, constraints, defaults, FKs, indexes, grants, and current RLS cannot be certified.
- The invitation-only `handle_new_user` source explicitly says it was reconstructed, not captured live. The draft preserves its nonce/inactive-member branch byte-for-byte, but the current production trigger definition, owner, grants, search_path, and Auth lifecycle trigger binding still need comparison.
- Historical Auth FKs on company/membership tables are evidenced, but current FK/index/constraint state, database-function ownership and privileges (including trigger execution and RPC access to referenced tables), and all intervening live changes are not fully evidenced. No schema readiness claim is made.
- Row locking and completed-row handling are source-tested. Actual rollback, repeated/concurrent confirmation, tenant isolation, pending-row expiry/purge, account deletion, and completed-company deletion behavior require isolated staging verification. No runtime SQL idempotency test was run.

## Existing security boundaries

Self-service trigger records pending intent only. An existing pending invitation takes precedence and keeps the exact nonce check and Invited membership path. Confirmation token verification occurs only after an explicit click and POST. Cookie sessions use the existing server client with HttpOnly/Secure/SameSite=Lax cookies. Provisioning RPC has no arguments, uses auth.uid(), verifies confirmed matching email, locks the pending row, and grants only company_admin. Unexpected Auth errors return failures with action/event/code/status-only server diagnostics. Confirmation provisioning failures revoke the session; session reads do not provision.

## Manual prerequisites — only after review

1. Obtain the complete current catalog and trigger definition for review; approve a real missing-TIN policy. Revise/re-review the draft rather than removing its fail-closed guard alone.
2. Review and apply only to an isolated staging environment first. Verify nonce protection and manual invitation acceptance, email confirmation, RPC permissions, concurrent/repeated provisioning, tenant isolation, expiry/recovery, and rollback.
3. Configure server-only `AUTH_SITE_URL` to the actual canonical origin for each environment. HTTPS is required in production; explicitly configured localhost/127.0.0.1 HTTP is accepted only outside production. No Host/forwarded-header fallback or inferred preview domain exists. Local development must supply it in the server process; no environment setting was changed here.
4. Configure the signup-confirmation email link as `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`, with the corresponding allowed redirect. Do not change the invitation template or its nonce/manual-acceptance path.
5. Verify the existing Turnstile site key and Auth CAPTCHA configuration in staging. Test registration and resend with real CAPTCHA and confirmation-email delivery, including duplicates and service failures.
6. Only after review, staging checks, migration approval and an authorized deployment may public signup be enabled. Keep email confirmation ON. No production-ready or deployment claim is made by these source changes.