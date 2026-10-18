# Architecture rules

- Keep taxpayer credential UI in a dedicated settings section with an explicit contract adapter that strips non-metadata response fields; this isolates secret handling from company identity updates and the non-secret APP draft.
- Credential requests must use the existing authenticated client with no client-supplied tenant identity or environment, and expose only actions supported by the checked-in contract; server membership and authorization remain authoritative while external deployment access is unavailable.
- Re-key the credential section by authenticated user, active company, and saved environment, and scope metadata queries identically; this clears sensitive transient input when the context changes without pretending the backend has per-environment secret storage.- Route all nrs-submit calls through src/lib/nrs/submitContract.ts via useNrsSubmit; success requires data.ok === true and unconfirmed outcomes must block retry.
