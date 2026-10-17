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
