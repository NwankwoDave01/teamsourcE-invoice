# Plan — Multi-tenant NRS taxpayer credential architecture (Settings only)

## 0. What I verified first (and one thing I could not)

Confirmed by reading the code:
- The NRS Integration UI lives entirely in `src/pages/tenant/Settings.tsx` (663 lines, tab `value="nrs"`).
- `nrs` form state holds all ten fields, including `nrs_api_key`, `nrs_api_secret`, `nrs_portal_password` (lines 29–40), hydrated straight from the `companies` row (lines 68–77).
- `handleSaveNrs` writes the whole object — secrets included — through `useUpdateCompany()` (a plain `companies` UPDATE in `src/hooks/useCompanyData.ts`).
- `isConnected` is purely a non-empty check over six fields, `nrs_api_key`/`nrs_api_secret` among them.
- The "Verify & Connect" button calls `handleSaveNrs` only. It verifies nothing.
- `Reset` re-hydrates from `company`, i.e. it re-reads the secrets. `Disconnect` nulls all ten columns.
- There is **no** Entity ID field anywhere in the codebase.
- `src/hooks/useVerifyTaxpayer.ts` is unrelated (TIN lookup) but in production mode it reads `company.nrs_api_key` **in the browser** and puts it in an `x-api-key` header — a second client-side secret leak.

Could not verify, so the plan starts by checking it:
- `supabase/functions/` contains only `nrs-submit` — there is **no `nrs-credentials` function in this repository**.
- `src/integrations/supabase/types.ts` has no `nrs_entity_id`, no `nrs_taxpayer_email`, and no `nrs_credentials` table.
- The app points at your personal Supabase project, which my read-only query tool cannot reach, so I cannot confirm the columns/table/Vault setup exist there. **Phase A step 1 is a verification step**, not an assumption.

If `nrs-credentials` exists only in your Supabase dashboard and not in the repo, we must first pull its source into `supabase/functions/nrs-credentials/index.ts` so the repo is the source of truth. I will not touch `nrs-submit`.

## 1. Existing responsibilities (file map)

| Concern | Location |
| --- | --- |
| Settings page + all tabs | `src/pages/tenant/Settings.tsx` |
| NRS tab markup | same file, `<TabsContent value="nrs">` (~line 299 onward) |
| NRS form state | same file, `useState` block ~line 29, hydration `useEffect` ~line 60 |
| NRS save | `handleSaveNrs` (~line 96) → `useUpdateCompany()` |
| NRS disconnect | `handleDisconnectNrs` (~line 122) → `useUpdateCompany()` |
| Connection status | `isConnected` boolean (~line 162) |
| Company read/update hooks + types | `src/hooks/useCompanyData.ts` (`useCurrentCompany`, `useUpdateCompany`, `DBCompany`) |
| Generated DB types | `src/integrations/supabase/types.ts` |
| Roles / company scope | `src/contexts/AuthContext.tsx` |

## 2. Frontend changes (minimum)

Keep the card layout, section headings, badges, eye-toggles, and the three footer buttons exactly as they are. Changes:

- **Split the state** into `nrsConfig` (non-secret: environment, business ID, entity ID, service ID, certificate ID, sandbox URL, production URL, taxpayer email) and `nrsSecrets` (write-only: api key, api secret, taxpayer password). Only `nrsConfig` is hydrated from `company`.
- **Add Entity ID** as a new `Field` in the "Corporate Tax Identity"/identifiers group, next to Business ID, bound to `companies.nrs_entity_id`.
- **Rename labels** "NRS Portal Email" → "NRS Taxpayer Email", "NRS Portal Password" → "NRS Taxpayer Password", and retitle the section "NRS Taxpayer Credentials". Taxpayer email is non-secret and stays a normal company field (`nrs_taxpayer_email`).
- **Secret inputs become write-only**: value starts empty, placeholder shows `Configured — leave blank to keep` when the backend reports it is set, or `Not configured` otherwise. Blank on submit = leave unchanged. Keep the existing eye toggle for what the user is currently typing; there is nothing stored to reveal.
- **`handleSaveNrs` splits into two calls**: `useUpdateCompany()` for the non-secret fields only, then — if any secret input is non-empty — one POST to `nrs-credentials`. Secrets never enter the `companies` update object.
- **`isConnected` comes from the backend**, not from field emptiness (see §4).
- **Reset** re-hydrates non-secret fields and clears the secret inputs; it never pulls secret values back.
- **Disconnect** nulls only the non-secret NRS columns and calls `nrs-credentials` DELETE to drop the stored secrets and clear verification state.
- **Authorization**: keep the existing `isCompanyAdmin` gate on every input and the action row; the backend re-checks it independently.
- **No `console.log` of any secret**, no secret in React Query cache keys, no secret in toast text or thrown error messages.

New small hook file `src/hooks/useNrsCredentials.ts` to hold the three calls (status query, save mutation, delete mutation) so `Settings.tsx` stays presentational.

## 3. Backend integration contract (`nrs-credentials`)

Invoked with `supabase.functions.invoke("nrs-credentials", { body })` — never by URL path. The function derives identity from the caller's JWT and the company from `company_members`; **`company_id` is never trusted from the request body**. Authorization via `rpc("can_manage_company", { _user_id, _company_id })`.

- **GET / `{ action: "status" }`** → metadata only:
  `{ api_key_configured: bool, api_secret_configured: bool, taxpayer_password_configured: bool, verified: bool, verified_at: timestamp|null, last_error: string|null, environment: string }`. Never any secret value, not even masked or partial.
- **POST / `{ action: "save", api_key?, api_secret?, taxpayer_password? }`** → stores each provided value in Vault, upserts the `*_secret_id` references in `nrs_credentials` keyed by `company_id`; omitted keys are left untouched. Returns the same status shape. On save, verification state resets to unverified.
- **DELETE / `{ action: "disconnect" }`** → removes the Vault entries and the `nrs_credentials` row, clears verification state.

Every response is metadata; the function must not echo request bodies and must not `console.log` the incoming payload.

## 4. Verification design ("Verify & Connect")

Minimal architecture: **no new Edge Function.** Add a `{ action: "verify" }` branch to `nrs-credentials`, because it is the only component that can read the Vault secrets.

Flow: admin fills secrets → save (§3) → verify → function loads api key/secret/taxpayer password from Vault plus taxpayer email and the environment's base URL from `companies` → `POST {base}/api/v1/utilities/authenticate` with `{ email, password }` and headers `x-api-key` / `x-api-secret` → on HTTP 2xx mark verified, else mark failed and return a sanitised reason.

The button keeps its label and does save-then-verify in one click, reporting via toast.

State needs to persist somewhere. Preferred: three columns on the existing `nrs_credentials` table — `verified boolean not null default false`, `verified_at timestamptz`, `last_verification_error text`. That is a small additive migration to a table that already exists; it introduces no new table and no secret storage. `isConnected` in the UI then means `verified === true`. (This migration is the one DB change the plan requests — it happens in implementation, not now.)

## 5. Database alignment

Use only what exists: `companies.nrs_entity_id`, `companies.nrs_taxpayer_email`, the `nrs_credentials` table (+ the three verification columns above), and Vault for secret values. No second credentials table.

Types to update: `src/integrations/supabase/types.ts` must be regenerated so `companies` includes `nrs_entity_id` and `nrs_taxpayer_email` and `nrs_credentials` appears — today it has neither, which is why the UI cannot bind Entity ID yet. `DBCompany` in `useCompanyData.ts` derives from that file and needs no manual edit. Add a local `NrsCredentialStatus` interface in the new hook.

## 6. Security problems in the current implementation

1. API key, API secret and the taxpayer password are stored in plaintext `companies` columns and travel to every browser that loads Settings, because `useCurrentCompany()` does `select("*")`.
2. Any authenticated company member can read those columns — the RLS SELECT policy is `is_company_member`, not admin-only. A staff user can read the company's NRS secrets today.
3. `handleSaveNrs` lets the browser write secrets directly; the admin check is client-side only for the button, so the DB write path is the only real gate.
4. `useVerifyTaxpayer` sends `company.nrs_api_key` from the browser to an external host in production mode.
5. `isConnected` is cosmetic — it claims "Active Connection" for values never validated against NRS.
6. Secret values sit in the React Query cache under `["company", companyId]` and in React state, so they surface in devtools and in any error/console dump.

How the plan fixes each: secrets move to Vault behind an Edge Function (1, 3); the browser stops selecting or receiving them (1, 6); the function re-checks `can_manage_company` server-side (3); `useVerifyTaxpayer` production path is switched to a server-side call in a later phase, tracked but out of this task's write scope (4); connection status becomes an NRS-authenticated fact (5).

## 7. Backward compatibility

Nothing is deleted or migrated automatically now.

- **Phase 1 (this task):** stop reading and writing `nrs_api_key`, `nrs_api_secret`, `nrs_portal_password` from the browser. The columns keep their current values, untouched. `nrs_submit` continues to work unchanged because it reads its credentials from Edge Function env secrets, not from these columns — confirmed by reading the function.
- Existing `nrs_portal_email` value should be copied into `nrs_taxpayer_email` once (one-line additive backfill) so nothing appears blank after the rename; `nrs_portal_email` stays as-is.
- Any admin with existing secrets simply re-enters them once through the new write-only fields. The status endpoint will show "Not configured" until they do, which is honest.
- **Phase 2 (later, separate approval):** after confirming every active company has Vault credentials, drop `nrs_api_key`, `nrs_api_secret`, `nrs_portal_password`, and `nrs_portal_email` from `companies`. Not part of this task.

## 8. File-by-file plan

**`src/integrations/supabase/types.ts`** — generated DB types. *Change:* regenerate to include `nrs_entity_id`, `nrs_taxpayer_email`, `nrs_credentials`. *Why:* the UI cannot type-safely bind Entity ID without it. *Must not change:* nothing hand-edited; regenerate only.

**`src/hooks/useNrsCredentials.ts`** — new. *Change:* `useNrsCredentialStatus()` query plus `useSaveNrsCredentials()` and `useDisconnectNrsCredentials()` / `useVerifyNrsConnection()` mutations, all via `functions.invoke`. *Why:* keeps secret handling out of the page and out of `useCompanyData.ts`. *Must not:* cache or return any secret value.

**`src/pages/tenant/Settings.tsx`** — the page. *Change:* split state, add Entity ID field, rename the two taxpayer labels, make the three secret inputs write-only, split save into company-update + credentials-save, drive `isConnected` from status, adjust Reset/Disconnect. *Why:* §2. *Must not change:* the Company and Tax & Compliance tabs, the card/grid layout, `Field`/`ToggleRow` helpers, the `isCompanyAdmin` gating pattern, the footer button set and labels.

**`src/hooks/useCompanyData.ts`** — company CRUD. *Change:* none required if the page simply stops sending secret keys. Optional hardening: have `useUpdateCompany` strip the three secret keys defensively. *Must not change:* `useCreateInvoice`, invoice/product/customer hooks, `seedDemoData`.

**`supabase/functions/nrs-credentials/index.ts`** — bring into the repo and extend with the `verify` action + verification-state writes. *Why:* only the server may read Vault and call NRS. *Must not change:* `supabase/functions/nrs-submit/**` — untouched.

**One additive migration** — three verification columns on `nrs_credentials`, plus the one-time `nrs_taxpayer_email` backfill. Nothing dropped.

Explicitly not modified: `src/lib/nrs/**`, `src/pages/tenant/CreateInvoice.tsx`, `InvoiceDetails.tsx`, `Invoices.tsx`, product/customer forms, `nrs-submit`, `src/integrations/supabase/client.ts`.

## 9. Implementation order

A. Verify the backend pieces really exist (columns, `nrs_credentials`, Vault, `nrs-credentials` function); pull the function source into the repo. Regenerate types.
B. Confirm/extend the `nrs-credentials` contract (status/save/disconnect/verify) and add the verification columns.
C. Add `useNrsCredentials.ts`.
D. Wire `Settings.tsx`: Entity ID, renames, write-only secrets, split save, status-driven badge, Reset/Disconnect.
E. Wire Verify & Connect end to end.
F. Cleanup: move `useVerifyTaxpayer`'s production path server-side; schedule the Phase-2 column drops.

## 10. Test plan

1. Load Settings as company admin — all existing non-secret NRS values render unchanged; the three secret inputs are empty with a "Configured"/"Not configured" placeholder.
2. Save Entity ID → reload → value persists on `companies.nrs_entity_id`.
3. Save Taxpayer Email → persists on `nrs_taxpayer_email`; label reads "NRS Taxpayer Email".
4. Enter API key only → save → status shows api key configured, api secret/password unchanged.
5. Same for API secret and taxpayer password, each independently.
6. Masking: secret inputs are `type="password"` until the eye toggle; no stored value is ever pre-filled.
7. Network tab: no response from `nrs-credentials` or from the `companies` select contains an api key, api secret, or password. Console contains no secret. Function logs contain no secret.
8. Sign in as a `staff_user` — every NRS input is disabled, and a direct `functions.invoke("nrs-credentials", { action: "save" })` returns 403.
9. Cross-tenant: an admin of company A cannot affect company B's credentials even by passing a foreign `company_id` in the body.
10. Verify & Connect with valid sandbox credentials → toast success, badge flips to "Active Connection", `verified_at` set.
11. Verify & Connect with a wrong password → toast failure with a sanitised message, badge stays "Disconnected", `last_verification_error` recorded, no secret in the message.
12. Disconnect → non-secret NRS fields cleared, `nrs_credentials` row gone, badge "Disconnected", status reports nothing configured.
13. Reset → non-secret fields revert to saved values, secret inputs clear, nothing is fetched back.
14. Regression: create an invoice and run a mock NRS submission — unchanged behaviour.

## 11. Risk check

- **Types drift** — regenerating `types.ts` after the schema changed can surface pre-existing `as any` casts elsewhere in `useCompanyData.ts`. Typecheck is currently clean; keep it clean.
- **`nrs-credentials` may not exist in the repo** — biggest unknown; Phase A gates everything.
- **`useVerifyTaxpayer` breaks in production mode** the moment `companies.nrs_api_key` is emptied. It already only works in sandbox in practice, but do not clear those columns until step F.
- **`isConnected` semantics change** — companies that look "connected" today will read "Disconnected" until they verify. Intended, but worth telling users.
- **Disconnect touching Vault and `companies` is not atomic** — if the Vault delete fails, clear the columns anyway and report partial failure rather than silently succeeding.
- **RLS on `nrs_credentials`** — must not allow client SELECT of the `*_secret_id` columns to non-admins; service-role access from the function only.
- **Settings.tsx is 663 lines** with three tabs in one component; edits must stay inside the NRS tab to avoid collateral damage.

## 12. Final recommendation

Minimal scope: regenerate types, add one small hook, rewire the NRS tab of `Settings.tsx`, formalise the `nrs-credentials` contract with a `verify` action, add three verification columns. Nothing else.

Modify: `src/integrations/supabase/types.ts`, `src/hooks/useNrsCredentials.ts` (new), `src/pages/tenant/Settings.tsx`, `supabase/functions/nrs-credentials/index.ts`, one additive migration.

Do not modify: `nrs-submit`, `src/lib/nrs/**`, invoice pages and hooks, product/customer forms, other Settings tabs, `client.ts`.

Database objects: `companies.nrs_entity_id`, `companies.nrs_taxpayer_email`, `nrs_credentials` (+ verification columns), Vault.

Later phases: server-side TIN verification, dropping the legacy plaintext columns, per-company secret rotation and audit-log entries for credential changes.
