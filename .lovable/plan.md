# TS-Flow — Full Project Audit (Current State)

Read-only audit. No code changed.

## 1. Architecture

React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui. State/data via TanStack Query. Routing via React Router v6 with two guarded shells.

```text
main.tsx → App.tsx (QueryClient, Tooltip, Toasters, BrowserRouter, AuthProvider)
  public: / , /auth/login , /auth/signup , /api-docs , /sla , /privacy-policy
  ProtectedRoute            → /app/*    (TenantLayout + TenantSidebar + TopBar)
  ProtectedRoute superAdmin → /admin/*  (AdminLayout + AdminSidebar)
Data layer: src/hooks/useCompanyData.ts (single 610-line hook file, all CRUD)
NRS layer:  src/lib/nrs/{buildPayload,validators,codes,types,irn}.ts
Backend:    Supabase (Postgres + RLS + Auth) + 1 edge function `nrs-submit`
Branding:   src/lib/brand.ts + components/shared/BrandMark.tsx
```

TypeScript check currently passes with **zero errors**.

## 2. Frontend pages

Public: `LandingPage` (marketing + footer), `ApiDocs`, `SLA`, `PrivacyPolicy`, `NotFound`.
Auth: `Login`, `Signup` (email/password, company metadata on signup).

Tenant (`/app`):
- `Dashboard` — KPI cards + charts from live invoice data
- `Customers` / `customers/new` / `customers/:id/edit` (`CustomerForm`, full NRS buyer schema)
- `Products` / `products/new` / `products/:id/edit` (`ProductForm`, unit_code, tax_category, HS codes)
- `Invoices` — list, filters, bulk select, bulk submit/delete, row action menu
- `CreateInvoice` — 619-line builder: header, NRS fields, line editor, master-data selectors
- `InvoiceDetails` — totals, lines, workflow advance, reject, NRS payload preview, submit
- `Reports`, `Team`, `AuditLogs`, `Settings` (Company, Tax & Compliance, NRS Integration tabs)
- `onboarding/CompanyOnboarding` — shown by TenantLayout when the user has no company

Admin (`/admin`): `Overview`, `Companies`, `Users`, `InvoiceTraffic`, `IntegrationHealth`, `SystemLogs`, `Settings`.

## 3. Tables and relationships in use

```text
auth.users ─1:1─ profiles
auth.users ─1:N─ company_members ─N:1─ companies
auth.users ─1:N─ user_roles (company_id nullable → platform-level super_admin)
companies ─1:N─ customers, products, invoices, audit_logs
invoices  ─1:N─ invoice_lines ─N:1─ products
invoices  ─1:N─ nrs_submissions
global:   nrs_master_data (read-only lookups), integration_health, system_logs
```
All tenant tables are read-filtered by `is_company_member()` and write-gated by `can_manage_invoices()` / `can_manage_company()`. Every table the UI touches is queried somewhere in `useCompanyData.ts` or `buildPayload.ts`.

## 4. Edge functions / backend logic

Only one function exists in the repo: **`nrs-submit`** (559 lines).
- Auth: requires `Bearer` token, resolves the user with the anon client, then authorizes via `rpc('can_manage_invoices')`. Data access uses the service-role client.
- Fetches invoice + lines + company + customer; derives environment from `companies.nrs_environment`.
- Builds its **own** UBL-ish payload (`buildParty`, `buildPayload`, `omitEmpty`, `TAX_CATEGORY_ID`, `INVOICE_TYPE_CODE`).
- IRN: `InvoiceNumber-ServiceID-YYYYMMDD`, reused if already persisted.
- Mock path: no HTTP; `force_fail` returns a rejection.
- Sandbox/production path: authenticate → validate → sign → transmit against `nrs_sandbox_base_url` / `nrs_production_base_url` with `NRS_API_KEY/SECRET` + taxpayer email/password from env.
- Writes `nrs_submissions` (payload, validation_errors, result, scenario, mock, created_by), then updates `invoices.irn` + status.

Database logic: `handle_new_user()` trigger auto-provisions profile + company + membership + `company_admin` role; `touch_updated_at` triggers; security-definer helpers `has_role`, `is_super_admin`, `is_company_member`, `can_manage_company`, `can_manage_invoices`.

## 5. Authentication + RBAC

`AuthContext` subscribes to `onAuthStateChange` before `getSession`, then loads the first active `company_members` row plus all `user_roles` rows. Exposes `user`, `session`, `companyId`, `roles`, `isSuperAdmin`.
`ProtectedRoute` blocks unauthenticated users and redirects non-super-admins away from `/admin`. Roles: `super_admin`, `company_admin`, `finance_officer`, `staff_user`. Role enforcement is real at the database layer (RLS + definer functions); the frontend mostly uses roles for read-only gating (e.g. NRS Integration tab is admin-only).

## 6. Invoice workflow end-to-end

```text
Draft → In Review → Approved → Ready → Submitted → Validated → Signed → Confirmed
                                                          └→ Rejected
```
1. `CreateInvoice` builds header + lines; `useCreateInvoice` computes `subtotal`, `tax`, `total` and per-line `net_amount`, `tax_amount`, `line_total`, plus `unit_code`, `tax_category`, `tax_scheme='VAT'`, `discount_amount`, classification codes. Inserted as `Draft`.
2. `InvoiceDetails` advances status one step at a time via `useUpdateInvoiceStatus` (plain DB update), or rejects behind a confirm dialog.
3. Preview NRS Payload uses the **client** builder (`src/lib/nrs/buildPayload.ts`) + `validators.ts` — errors block, warnings inform.
4. At `Ready`, Submit invokes `nrs-submit`; the function computes IRN, logs the submission, and sets status (mock success → `Signed`, failure → `Rejected`).
5. `Confirmed` is still a manual UI step after signing.

## 7. NRS/FIRS integration status

- **Mock: complete.** No outbound HTTP, IRN generated, submission logged, status walked, `force_fail` supported.
- **Sandbox/production: code written, unverified.** The validate/sign/transmit chain exists but has never been exercised against the real service; endpoint paths, header scheme (`x-api-key`/`x-api-secret`), and the payload shape are best-effort mappings from the schema docs, not confirmed by a live response.
- Secrets (`NRS_API_KEY`, `NRS_API_SECRET`, `NRS_TAXPAYER_EMAIL`, `NRS_TAXPAYER_PASSWORD`) are read only server-side. Note `companies` also has plaintext `nrs_portal_password`, `nrs_api_key`, `nrs_api_secret` columns — a security concern that should be dropped or moved to secrets.
- Taxpayer lookup (`useVerifyTaxpayer`) is a hardcoded mock list, not a real TIN lookup.

## 8. Fully complete

- Auth (signup/login/signout), session handling, route guards, company auto-provisioning + onboarding fallback
- Customer, product, and invoice CRUD against the real NRS-extended schema
- NRS payload preview + validation, invoice/line math (net/tax/total consistency)
- NRS Integration settings tab (6 non-secret fields, admin-only, read-only for others)
- Mock submission end-to-end incl. `nrs_submissions` logging
- Branding system, favicon/manifest set, Privacy Policy / SLA / API Docs pages
- Destructive-action confirmations for bulk delete and reject

## 9. Partially complete

- **Sandbox/production submission** — implemented but untested; no retry, no status polling, no signature/QR persistence
- **Admin console** — reads live data but is view-only: no suspend/plan changes, no cross-company actions, `Users` shows `email: "—"` because `auth.users` isn't reachable from the client
- **Audit logging** — table + viewer exist, but the app rarely writes entries (only demo seed); invoice/customer/product mutations are not audited
- **Team management** — lists members and roles; no invite, role change, or disable flow
- **Reports** — chart surface exists, no export
- **Master data** — `useNrsMasterData` works but still ships a `console.log` debug line

## 10. Missing or broken

- Row actions in `Invoices.tsx` are inert: **Edit, Duplicate, Download PDF, Print, Void invoice** are menu items with no handlers
- No invoice edit route at all (`/app/invoices/:id/edit` does not exist) — a Draft cannot be corrected
- No PDF generation and no print stylesheet
- No Void/credit-note path, so an issued invoice cannot be legally reversed
- No status refresh/reconcile from NRS after submission
- No real TIN/taxpayer verification
- `nrs-sync` (master-data refresh) is referenced in prior planning but does not exist in the repo
- Plaintext credential columns on `companies` (see §7)
- No pagination on invoice/customer/product lists; no error boundary; `system_logs` write path is super-admin-only and unused

## 11. Duplicated or outdated logic

- **Two payload builders** — `src/lib/nrs/buildPayload.ts` (camelCase preview shape) and `buildPayload()` inside the edge function (snake_case UBL shape). They diverge: the client zeroes tax only for Z/E/O, the function zeroes for anything that isn't `S`. The preview can therefore disagree with what is actually submitted.
- **Tax computation repeated three times** — `useCreateInvoice`, client `buildPayload`, edge function.
- `src/mock/data.ts` (264 lines) is now imported by nothing — dead code.
- `seedDemoData()` in `useCompanyData.ts` writes demo invoices/lines without the NRS line fields, producing rows that trigger preview warnings.
- `useCompanyData.ts` is a 610-line grab bag (tenant CRUD + admin queries + seeding + NRS submit) that should be split.
- `INVOICE_TYPE_CODE` / tax-category maps are duplicated between `src/lib/nrs/codes.ts` and the edge function.
- Frequent `as any` casts around insert/update payloads, weakening the generated Supabase types.

## Recommended next priorities

1. Unify the payload builder + tax rules into one shared module (correctness risk).
2. Implement invoice Edit / Duplicate / Void, then Print/PDF (visible broken actions).
3. Remove plaintext credential columns from `companies`.
4. Add audit-log writes on all mutations.
5. Verify sandbox submission against the real endpoint before any production switch.
