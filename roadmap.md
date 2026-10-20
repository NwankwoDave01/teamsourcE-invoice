# Frontend SI → APP alignment

- [x] Audit NRS/APP settings, onboarding, invoice workflow, and public documentation
- [x] Replace credential-oriented settings with honest APP connection setup
- [x] Align onboarding and invoice labels/actions with SI → APP architecture
- [x] Replace invented API documentation with confirmed/pending architecture facts
- [x] Verify prior frontend alignment (typecheck/tests passed; lint had existing errors)

## Tenant credential audit fixes
- [x] Match credential types/hooks to the available backend contract; remove unsupported crypto/verification actions
- [x] Add write-only admin credential settings, metadata/error states, and guarded disconnect; keep APP draft separate
- [x] Test tenant scoping, secret handling, permissions, and unsupported capability behavior; check frontend diagnostics

External deployment version and authenticated live save/disconnect remain unverified: project tools target a different backend from the browser client. Crypto support and per-environment secret storage are absent from the available source contract and require confirmed backend support outside this frontend task.

## Submit/credential/status alignment
- [x] Fail-closed nrs-submit result adapter; list/detail handling with no unsafe retry
- [x] Tolerant credential metadata (legacy + live fields); verification ≠ readiness
- [x] Submission status shown from submission_status only; neutral dashboard labels
- [x] Preview labelled local-only; Settings/docs separate current NRS sandbox from planned APP
- [ ] Blocked: live response fixtures for nrs-submit / nrs-credentials v13 (needs external backend access)
- [ ] Blocked: verify / save_crypto / validate_crypto UI (request/response contract not confirmed)

## Frontend safety continuation
- [ ] Persisted, tenant-scoped retry eligibility and honest list/detail submission status
- [ ] Sanitized deployed submit-response fixtures and local preflight regression tests
- [ ] Review credential allowlist and repair merged architecture rule
- [ ] Run available frontend checks; inspect final diff without live submissions or writes

## NRS crypto settings (preview only)
- [x] Add confirmed save_crypto and explicit validate_crypto controls with write-only inputs
- [x] Map crypto metadata and distinguish local format checks from NRS acceptance
- [x] Run credential tests and changed-file lint; inspect preview diagnostics
- [ ] External authenticated save/check flow requires manual verification (no live writes in this task)

## Create-invoice form trim (preview only)
- [x] Remove visible Payment terms and Exchange rate inputs plus their unused state/submit properties
- [x] Keep currency selection, payment means, invoice type, DB columns and stored defaults unchanged
- [x] Typecheck, tests, changed-file lint and build all pass

## Dropdown display labels (preview only)
- [x] Frontend-only label resolver for invoice type and payment means (metadata.value, then label, then code)
- [x] Explicit display overrides 380 Commercial Invoice, 381 Credit Note, 383 Debit Note; values stay the stored codes
- [x] Backend master-data rows, payload mapping and selected values untouched

## Invoice type code alignment (nrs-submit v82)
- [x] INVOICE_TYPE_CODE: commercial 380, credit_note 381, debit_note 383, corrected 384, proforma 325
- [x] Shared normalizeInvoiceTypeCode (empty/commercial->380, 3-digit codes preserved, aliases mapped, fallback 380) used by buildPayload.ts and the checked-in nrs-submit copy
- [x] Focused mapping tests; typecheck/tests/build passed (lint: new files clean, pre-existing any errors in buildPayload.ts untouched)
