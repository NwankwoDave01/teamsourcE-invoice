# W1 — Secure session storage

## Audit findings

- `src/integrations/supabase/client.ts` creates a browser Supabase client with
  `persistSession: true` and `autoRefreshToken: true`. It supplies
  `brokeredPreviewStorage()` as Auth storage.
- `src/integrations/supabase/previewAuthStorage.ts` uses `localStorage` outside
  Lovable preview frames. In preview frames it also writes the session to
  `localStorage` and brokers a copy through `postMessage`. This makes the
  Supabase access and refresh tokens readable by page JavaScript and persistent
  across browser restarts.
- `src/pages/auth/Login.tsx` signs in using `signInWithPassword` and a
  Turnstile CAPTCHA token.
- `src/contexts/AuthContext.tsx` observes Auth events and calls `getSession`.
  The Supabase client refreshes tokens automatically. On a normal session load,
  it attempts the existing invitation acceptance contract, then reads only
  `Active` membership and corresponding roles. It guards stale asynchronous
  membership responses.
- `src/contexts/AuthContext.tsx`, `src/components/shell/TopBar.tsx`, and
  onboarding/settings surfaces log out with `auth.signOut`.
- `src/pages/auth/AcceptInvitation.tsx` requires an explicit user click before
  calling `verifyOtp` with the invitation `token_hash` (to avoid email-scanner
  acceptance), sets a password, calls `tenant-admin` with
  `accept_invitation`, then verifies active membership before entering the
  workspace. Existing database triggers/migrations enforce invitation-only
  Auth-user creation and invitation validity.
- `src/components/auth/ProtectedRoute.tsx` provides client-side route guards.
  Tenant membership/roles are loaded through user-scoped Supabase reads; the
  database RLS policies and authenticated Edge Functions remain the authority
  for data and privileged operations.
- No password-recovery UI or recovery method call exists in `src/`. There is no
  explicit browser `refreshSession` call; refresh is the Supabase client's
  automatic behavior.
- Browser code invokes `audit-log`, `tenant-admin`, `nrs-credentials`, and
  `nrs-submit` through `supabase.functions.invoke`. The SDK sends the
  publishable `apikey` and the current user's bearer authorization header.
  These functions validate the user token; protected database
  operations continue to use RLS or server-side authorization. `nrs-sync` and
  `nrs-qr-repair` also validate bearer tokens but have no browser invocation
  found in `src/`. Service-role credentials are read from Edge Function
  environment variables, not the browser bundle.
- `vercel.json` configures security headers and a catch-all SPA rewrite. There
  is no existing server/API route or server-session dependency. Vercel Functions
  under `api/` can provide the required same-origin server component while
  retaining the Vite SPA deployment. Supabase Edge Functions are not suitable
  for setting this app's same-origin cookie.
- `supabase/config.toml` contains only the project ID. The repository does not
  define deployed Supabase Auth URL, CAPTCHA, token-expiry, refresh-token, or
  cookie settings; those are dashboard-managed and were not independently
  inspectable here. No `@supabase/ssr` or cookie/session package is currently
  declared. Existing `localStorage` uses for non-auth app drafts and NRS
  submission safety markers are separate from W1.

## Proposed architecture (documented before implementation)

Use Vercel Functions as a same-origin Backend-for-Frontend and
`@supabase/ssr` for Supabase Auth:

1. Auth routes on Vercel perform password sign-in, invitation OTP verification,
   password setup, session inspection, and sign-out. Supabase sessions are
   stored only in `Secure` (in production), `HttpOnly`, `SameSite=Lax`, `Path=/`
   cookies. Session inspection returns only a minimal user object, never access
   or refresh tokens.
2. The browser Supabase client targets a same-origin `/api/supabase` proxy and
   disables session persistence and automatic browser refresh. The proxy
   validates the cookie with Supabase Auth for each request, refreshes the
   session server-side when needed, and forwards only the authenticated user's
   JWT to Supabase REST/RPC and Edge Function endpoints. It never trusts a
   browser-supplied Authorization header.
3. Mutating auth requests require a same-origin `Origin`. Proxy requests require
   a same-origin `Origin` or `Sec-Fetch-Site` value; cross-site and same-site
   cross-origin requests are rejected. Edge Function routes accept POST only,
   while same-origin read-only PostgREST GET/HEAD requests remain supported.
   The cookie uses `SameSite=Lax`. The proxy forwards the user's JWT rather
   than using a service-role credential, preserving existing RLS,
   active-membership checks, tenant-admin authorization, role rules, invoice
   behavior, and NRS function contracts.
4. The invitation page retains explicit user confirmation before OTP
   verification, then password setup, `accept_invitation`, and Active-membership
   verification. Normal sign-in remains separate from explicit invite
   acceptance.
5. The Vercel server uses only the Supabase URL and publishable key; no
   service-role key is needed or configured in the frontend. The existing
   Supabase Edge Functions keep their current server-side secrets.

This requires Vercel Functions (provided by the existing Vercel deployment
configuration) and server-only `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` environment values for each deployed environment.
It does not require changing production Supabase Auth settings or running a
database migration.

## Implementation and deployment status

The design above was recorded before implementation. This branch now implements
the BFF in `api/auth/[action].ts` and `api/supabase/[...path].ts`, with cookie
and session handling in `api/_lib/session.ts`. In production, the cookie uses a
`__Host-` name and is host-only, Secure, HttpOnly, SameSite=Lax, and Path=/.
Mutating auth requests require an exact same-origin `Origin`. Proxy requests
require an exact same-origin `Origin` or same-origin Fetch Metadata, and Edge
Function requests are restricted to POST; same-origin PostgREST GET/HEAD
remains available. Each protected proxy request validates the cookie with
Supabase Auth, refreshes near-expiry tokens server-side, and sends the verified
user's JWT (not the browser's Authorization header) upstream.

The browser client now has persistence, automatic refresh, and URL session
detection disabled. Auth UI uses the Vercel auth routes, and existing
PostgREST/RPC and Edge Function calls keep using the Supabase SDK through the
same-origin proxy. Only a minimal user identity is returned to JavaScript. The
legacy Supabase localStorage key and its suffixes are removed at app startup;
other non-auth localStorage uses are unchanged. `vite.config.ts` runs the same
API handlers during local Vite development.

### Environment and deployment requirements

- Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel for Preview
  and Production. Keep these unprefixed (not `VITE_`) so they are available to
  functions and are not injected as server configuration into the browser.
  The publishable key is public by design; do not set a service-role key for
  this BFF.
- For local `npm run dev`, provide the same two variables in an ignored
  environment file or shell. The browser continues to use the existing
  publishable key; the server and browser values must identify the same
  Supabase project.
- First deploy to a Vercel Preview and verify `/api/auth/*` and
  `/api/supabase/*` are handled by Functions ahead of the existing catch-all
  SPA rewrite. Then test CAPTCHA login, refresh, logout, invite acceptance,
  active-membership/role reads, tenant-admin changes, invoice operations, and
  NRS sandbox workflows before Production promotion. No production deployment
  was performed here.
- The proxy function is configured for a 60-second maximum because the existing
  NRS submit Edge Function allows two outbound calls of up to 20 seconds each.
  Confirm the Vercel plan/runtime accepts this duration and that real sandbox
  submissions complete within it.
- Confirm the deployed Supabase Auth CAPTCHA and invitation redirect settings
  still match the existing Turnstile and `/auth/accept-invite` behavior. The
  dashboard settings could not be inspected from this repository.
- Supabase `signOut()` revokes the refresh session and the BFF clears the
  browser cookie. Already-issued Supabase access JWTs are stateless and can
  remain valid at Supabase until their expiry; strict immediate revocation of a
  copied access JWT would require a separately approved server-side revocation
  design or Auth configuration change.
- The new app clears the old app-origin localStorage Auth key. Any copy held in
  Lovable's editor-origin storage is outside this app's origin and is not
  cleared by this code; include it in the approved session cutover/revocation
  procedure if applicable.

### Rollback

If Preview validation fails, do not promote it; fix or abandon this branch.
If a promoted deployment must be rolled back, restore the previous Vercel
deployment and treat W1 as open again because that application resumes
JavaScript-readable token storage. Re-test the previous deployment's auth and
review the legacy-session exposure before allowing continued use. No
production Auth settings, credentials, or database schema were changed by this
work.

### Verification status and remaining evidence

- Added tests cover cookie attributes and token-free responses, login/CAPTCHA,
  near-expiry refresh, expired sessions, logout cookie clearing, invitation
  OTP/password setup, unauthenticated password-change rejection, CSRF, and
  forwarding only the cookie-authenticated user token to Edge Functions.
- Verification completed locally: all 32 test files (218 tests) passed;
  frontend/API type-check passed; the Vite production build passed. The build
  still reports the repository's stale Browserslist data and large-chunk
  warnings. Targeted ESLint found no errors and one Fast Refresh warning in
  `AuthContext.tsx`; full-repository lint remains failing on unrelated existing
  errors (67 errors and 10 warnings). `npm audit --omit=dev` reports 14
  dependency advisories (2 moderate, 12 high), not changed as part of W1.
- A local Vite API smoke request reached the session handler and returned its
  expected JSON configuration error because the local server-only Supabase
  environment values are not configured. This confirms API routing, not live
  authentication.
- The existing UI tests still exercise invitation-only onboarding, explicit
  acceptance, Active membership checks, and protected routes. The unit tests
  cannot prove the deployed Edge Functions' authorization or real Vercel cookie
  behavior; those require the Preview checks above.
- Do not mark W1 remediated until a Vercel Preview confirms production cookie
  attributes, no Auth tokens appear in browser storage or responses, old
  sessions are handled, logout blocks further app requests, and authenticated
  tenant/invoice/NRS workflows pass with deployed Supabase policy enforcement.
