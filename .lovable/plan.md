# NRS submit, credential contract and status semantics — frontend alignment

## Findings from the repository
- Repo `supabase/functions/nrs-submit/index.ts` still authenticates via `/utilities/authenticate`, validates, signs and optionally transmits, and returns `{ ok: response.status !== false, ... }`. It has no `stage`, `outcome` or `retry_safe` fields. The live function you describe (with those fields) is not in the repo, so the frontend contract below follows your description and must be confirmed against a captured live response before release.
- Repo `nrs-credentials` returns the old 7-field shape that `credentialContract.ts` enforces. Live v13 fields (`connection_status`, `credentials_verified`, `crypto_configured`, ...) are not in the repo, and neither are the `save_crypto` and `validate_crypto` actions. Because the Zod schema is strict, v13 responses are probably failing today with "incompatible contract".
- Submission is invoked in three places: `Invoices.tsx` (row and bulk, around lines 133–176), `InvoiceDetails.tsx` (around lines 98–110) and `useCompanyData.ts` (line 597). These paths are duplicated and treat responses differently. `InvoiceDetails` reads `data.response.message`.
- The database tracks `invoices.status` (Draft…Rejected) and `invoices.submission_status` (`not_submitted|pending|validated|rejected|timeout|failed`) separately. `StatusBadge` shows only `status`, and `Validated`/`Signed` map to "Processing".

## Behavior decisions
1. **Accurate labels (current live reality is direct NRS sandbox signing):** the action button reads "Validate & sign (NRS sandbox)", not "Submit to APP". "Submit to APP" is kept only as a disabled or hidden future action while the APP contract is pending.
2. **One shared submit adapter**, `src/lib/nrs/submitContract.ts`, with `parseSubmitResult(data, error)` → one of:
   - `success`: only when `data.ok === true` and stage is signed. Never inferred from HTTP 2xx.
   - `validation_rejected` (stage validate, outcome rejected): show the error and its details. Retry is allowed after edits.
   - `signing_rejected` (stage sign, outcome rejected): show the error. Retry is allowed only if `retry_safe === true`.
   - `unknown`: a missing or unparseable body, `outcome` set to unknown or timeout, `retry_safe !== true`, or a network or invoke error after the request was sent. Show "Outcome unconfirmed — do not resubmit; refresh status or contact support", disable the submit button for that invoice, and refetch.
   Unknown fields are stripped and raw `details` is rendered only as sanitized text.
3. **After every attempt**, whatever the result, invalidate the invoice, invoice list and `nrs_submissions` queries and refetch before re-enabling actions.
4. **Bulk submit** runs one at a time and stops the batch after any `unknown` result. The summary shows success, rejected, unconfirmed and skipped counts.
5. **Credentials adapter v13:** replace the strict schema with a v13 schema. Exact fields will be taken from a captured live status response, which is the first step below. Expected fields:
   - `environment`, `connection_status`
   - `api_key_configured`, `api_secret_configured`
   - `credentials_verified`, `verified_at`, `last_error`
   - `crypto_configured`, plus crypto-validation metadata if present
   All other fields are stripped, and booleans are never defaulted to true.
   - Actions: `status`, `save` (key and secret only), `save_crypto` (crypto_keys text, sent write-only and cleared after submit, with `gcTime: 0`), `validate_crypto`, `verify`, `disconnect`. All except `status` require an admin.
   - `verify` is shown only if live v13 confirms that it does not call `/utilities/authenticate`. Otherwise it stays hidden, in line with the existing SI rule.
   - UI states are shown separately: "Credentials saved", "Credentials verified", "Crypto configured/validated". "Ready to sign" is never derived from verification alone.
6. **Preflight:** CreateInvoice and the preview dialog run `strictValidators` (the shared backend source) next to the current warnings and label the result "Local preflight — not NRS validation". Only material mismatches are fixed:
   - Tax-category codes the backend rejects (for example `LOCAL_SALES_TAX` under strict validation)
   - Alphanumeric invoice-number rule
   - Required supplier and buyer TIN and email
   - Totals reconciliation
   - Unit and currency codes not in `nrs_master_data`
7. **Status semantics:** add a `SubmissionBadge` driven only by `submission_status` and shown next to `StatusBadge` in the invoice list and details:
   - not submitted
   - pending
   - validated
   - rejected
   - timeout → "Unconfirmed"
   - failed

   Dashboard and IntegrationHealth KPIs count from `submission_status` and `nrs_submissions`, not from `invoices.status`. "Accepted" by the APP is never shown. The database enum is unchanged.
8. **Settings and docs:** the NRS tab gets two clearly titled sections:
   - "Current: direct NRS sandbox signing" (credentials and crypto)
   - "Planned: SI → APP handoff (pending contract, local draft)"

   ApiDocs gets a "Current vs planned" block. It says the APP handoff is not live.

## Files to change
- New: `src/lib/nrs/submitContract.ts`, `src/hooks/useNrsSubmit.ts`, `src/components/shared/SubmissionBadge.tsx`
- `src/pages/tenant/Invoices.tsx`, `src/pages/tenant/InvoiceDetails.tsx`, `src/hooks/useCompanyData.ts` (remove the duplicate invoke and expose `submission_status`)
- `src/lib/nrs/credentialContract.ts`, `src/integrations/supabase/nrsTypes.ts`, `src/hooks/useNrsCredentials.ts`, `src/components/nrs/TaxpayerCredentials.tsx`
- `src/pages/tenant/CreateInvoice.tsx`, `src/components/nrs/NrsPayloadPreviewDialog.tsx`
- `src/pages/tenant/Dashboard.tsx`, `src/pages/admin/IntegrationHealth.tsx`, `src/components/shared/StatusBadge.tsx` (labels only)
- `src/pages/tenant/Settings.tsx`, `src/pages/ApiDocs.tsx`, `AGENTS.md` (submit-adapter rule)

## Order
1. Capture one real status response from `nrs-credentials` v13 and one each of a success, a rejection and a timeout from `nrs-submit`, using a sandbox tenant. Save them as test fixtures with secrets redacted. Without these, the schemas stay provisional.
2. Submit adapter and hook, then the list and details pages.
3. Credentials adapter and UI.
4. Status badges, dashboard and health KPIs.
5. Preflight, then Settings and docs copy.

## Risks
- Live and repo contracts diverge. A wrong guess could hide real success or show false success, which is why fixtures come first.
- The `verify` action may still call the APP-only authenticate endpoint.
- Bulk retries on timeout could create duplicate IRNs or signatures. This is mitigated by stop-on-unknown and refetch.
- The browser talks to the external backend, which Lovable tools cannot inspect. Authenticated end-to-end checks must be done manually.

## Test checklist
- `parseSubmitResult`:
  - A 2xx response with `ok:false` is not success, and a missing `ok` gives unknown.
  - `retry_safe:false` disables retry, and timeout gives unknown with no retry.
  - Validation rejection permits retry.
- Bulk submit stops after an unknown result, and every outcome triggers query invalidation.
- Credentials:
  - v13 parsing strips secrets and keeps the crypto and connection fields.
  - `credentials_verified` without `crypto_configured` does not show ready.
  - `save_crypto` sends no client company or environment, and non-admins cannot see the write or disconnect actions.
- `SubmissionBadge` maps every enum value, and `status = Signed` with `submission_status = rejected` shows "Rejected".
- Preflight blocks the strict-validator errors and is labeled as local.
- Existing tests in `nrsCredentials.test.ts` and `taxpayerCredentialsFlow.test.tsx` are updated for v13, then typecheck and build run.
