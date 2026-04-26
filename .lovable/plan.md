# Wire UI to Live Supabase Backend

The schema, RLS, auth, and data hooks are already in place. The remaining work is replacing `src/mock/data.ts` consumers with live Supabase queries through the existing hooks in `src/hooks/useCompanyData.ts`, while keeping the refined UI intact (no visual rebuilds).

## 1. Tenant pages — wire to live data

**Dashboard** (`src/pages/tenant/Dashboard.tsx`)
- Replace `invoices`/`customers`/`products` mock imports with `useInvoices()`, `useCustomers()`, `useProducts()`.
- Compute KPIs (total/draft/in review/approved/submitted/validated/signed/rejected), pipeline counts, recent invoices, and upcoming due invoices from live data.
- Add skeleton loading states and an empty state when the workspace has no invoices yet.

**Invoices list** (`src/pages/tenant/Invoices.tsx`)
- Source list from `useInvoices()`. Keep filters, bulk-select, and status badges.
- Bulk status updates use `useUpdateInvoiceStatus()` per selected row.
- Loading skeleton + refined empty state preserved.

**Create Invoice** (`src/pages/tenant/CreateInvoice.tsx`)
- Customer picker from `useCustomers()`, product picker from `useProducts()`.
- Auto-generate next invoice number (`INV-YYYY-#####`) by counting existing invoices.
- Submit calls `useCreateInvoice()` → navigate to `/app/invoices/:id` on success. Toast on error.

**Invoice Details** (`src/pages/tenant/InvoiceDetails.tsx`)
- Load via `useInvoice(id)` (already returns invoice + lines).
- Status transition buttons call `useUpdateInvoiceStatus()`.
- 404 state when invoice not found.

**Customers list + form** (`src/pages/tenant/Customers.tsx`, `customers/CustomerForm.tsx`)
- List from `useCustomers()`. Delete via direct `supabase.from("customers").delete()` with query invalidation.
- Create uses `useCreateCustomer()`. Edit loads + updates via Supabase, then navigates back.

**Products list + form** (`src/pages/tenant/Products.tsx`, `products/ProductForm.tsx`)
- Same pattern as customers, using `useProducts()` + `useCreateProduct()` and inline update/delete.

**Team** (`src/pages/tenant/Team.tsx`)
- List from `useTeam()` (already joins `company_members` + `profiles` + `user_roles`).
- Invite button shows a "coming soon" toast for now (email invites are out of scope per plan).

**Audit Logs** (`src/pages/tenant/AuditLogs.tsx`)
- Source from `useAuditLogs()`. Empty state when no logs.

**Reports** (`src/pages/tenant/Reports.tsx`)
- Aggregate metrics computed from `useInvoices()` + `useCustomers()`.

**Settings** (`src/pages/tenant/Settings.tsx`)
- Load from `useCurrentCompany()`. Update via `supabase.from("companies").update(...)` (gated to company admins by RLS).

## 2. Admin pages — wire to live data (super_admin only)

- **Overview** + **Companies**: use `useAllCompanies()`.
- **Users**: query `profiles` + `user_roles` (super-admin only via RLS).
- **Integration Health**: use `useIntegrationHealth()`. Seed a few rows on first super-admin visit if empty.
- **System Logs**: use `useSystemLogs()`.
- **Invoice Traffic**: aggregate across all companies (super-admin readable via `is_super_admin` RLS).

## 3. Cleanup

- Remove all `import { ... } from "@/mock/data"` from tenant + admin pages.
- Keep `src/mock/data.ts` only for any types still referenced by `StatusBadge.tsx` (or migrate `StatusBadge` to use the DB enum type from `useCompanyData.ts`).
- Add toast notifications (`sonner`) on mutation success/failure across all pages.
- Add `Loader2` skeletons for in-flight queries on every page.

## 4. Verification

- TypeScript compile clean.
- Manual flow: signup → seed runs → dashboard populated → create/edit/delete customer → create invoice → status transitions → log out / log in.
- Run the Supabase linter to confirm no new RLS issues.

## Out of scope (unchanged from earlier plan)

- Email-based team invitations (separate `invitations` table + edge function).
- Real NRS/FIRS API calls (status transitions remain manual).
- Storage buckets, Stripe billing, Google sign-in.
