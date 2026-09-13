# Frontend SI → APP architecture cleanup

## Scope
- Frontend changes only; no Edge Functions, migrations, schema, or backend integration logic.
- Preserve the existing visual system and NRS payload preview.

## Implementation
1. Audit customer setup, Settings, invoice screens, statuses, and public documentation.
2. Replace credential-oriented NRS settings with an honest NRS / APP Connection experience and local pending APP configuration where persistence is unavailable.
3. Clarify the post-signup path from workspace creation to APP connection.
4. Align invoice labels and actions to Draft → Pending approval → Approved → Submitted to APP without inventing backend behavior.
5. Rewrite API documentation around confirmed architecture and explicitly pending contract details.
6. Verify frontend type safety, tests, lint, and production build.
