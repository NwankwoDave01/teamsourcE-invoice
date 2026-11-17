# Inactivity session handling (preview source only)

The authenticated `/app` and `/admin` routes warn at 58 minutes and expire at
60 minutes. Public authentication, confirmation and invitation acceptance pages
do not run the idle controller. Thresholds are centralized in `src/lib/idleSession.ts`.

Visible, trusted pointer/mouse, keyboard, touch, scroll and click events renew the
deadline before the warning. During the warning the user must choose **Stay signed
in**, which validates the existing session through AuthContext and GET
`/api/auth/session`; a failed check or a check finishing after expiry cannot renew
the deadline. Wall-clock checks on visibility return/pageshow handle suspended
timers and browser sleep. Focus and background queries do not renew the deadline.

Cross-tab storage events carry only timestamps and active/expired/signed-out
status. Records are user-scoped except the sign-out notification, because the
same-origin HttpOnly cookie is shared by all tabs. A genuine activity timestamp
can extend another unexpired tab; stale events cannot revive an expired tab.
Unavailable browser storage still permits local expiry but prevents cross-tab
synchronization. No tokens, email addresses or membership data are stored.

Logout uses the existing POST `/api/auth/logout` with its existing origin checks,
Auth refresh-session revocation and HttpOnly cookie clearing. Local identity,
membership and in-flight requests are invalidated immediately; focus cannot
restore them. Failed server revocation is explicitly reported on login with a
retry action, not represented as confirmed. Explicit logout also synchronizes
tabs. Near-expiry token refresh remains server-side in `getAuthenticatedSession`.

## Server review and limitation

`api/_lib/session.ts` stores the provider session in HttpOnly cookies and validates
and refreshes it server-side; `api/auth/[action].ts` and the proxy use that
validation. There is no authenticated idle timestamp or existing integrity key
for a separate application cookie. Ordinary API traffic cannot establish genuine
user activity: updating an idle timestamp on every request would let polling
keep users alive. An unsigned timestamp cookie can be forged; a signed cookie
alone can be replayed and still cannot attest genuine human activity.

No server idle enforcement was added. A modified client can bypass client-only
idle expiry and keep using an otherwise valid cookie session. A strict server
idle/revocation guarantee needs a separately reviewed integrity/session design
and potentially shared durable session state. No process memory, schema changes,
secret/settings changes, Auth configuration changes, deployment or publication
are part of this task. A live cookie-backed multi-tab login/logout check remains
necessary before production rollout; simulated UI/API tests are not deployment
verification.