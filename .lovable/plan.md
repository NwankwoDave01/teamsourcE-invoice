
# Stabilization Plan — NRS Schema Alignment + New-User Onboarding

## Root causes (verified against live DB)

1. **Product creation fails** — `products` table has no `hsn_code`, `product_category`, `tax_category`, `unit_code`, or `item_classification_code`. `ProductForm.tsx` sends them, PostgREST rejects with *"could not find hsn_code in schema"*. Also, `tax_category` is typed in TS as `"S" | "Z" | "E" | "O"`, so any NRS-provided string like `LOCAL_SALES_TAX` is coerced/rejected client-side.
2. **Invoice creation fails** — `invoice_lines` is missing the same NRS columns (`hsn_code`, `product_category`, `tax_category`, `unit_code`, `discount_amount`, `net_amount`, `tax_amount`, `tax_scheme`, `item_classification_code`). `invoices` is missing `invoice_type`, `transaction_type`, `supply_date`, `payment_terms`, `payment_means_code`, `exchange_rate`. Same rigid enum for line `tax_category`.
3. **`nrs_master_data` and `nrs_submissions` tables do not exist** — `useNrsMasterData("hs-codes")` and the `nrs-submit` edge function insert both hit missing tables, producing schema fetch errors that surface as *"Failed to fetch"* on other pages.
4. **New-user blank dashboard** — the `handle_new_user` function exists but **no trigger on `auth.users` invokes it**, so new signups have no company / no membership. `useInvoices` is gated on `companyId`, but other side calls and layout render as broken. No onboarding UI intercepts the missing-company state.

## Files affected

- **Migration (new)** — add columns, create NRS tables, install `on_auth_user_created` trigger, seed baseline master data.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration runs.
- `src/hooks/useCompanyData.ts` — widen `tax_category` typing to `string`; no more `"S" | "Z" | "E" | "O"` narrowing in create payloads.
- `src/pages/tenant/products/ProductForm.tsx` — treat `tax_category` as free-form string; keep classification dropdown wired to `useNrsMasterData("hs-codes")` + `services-codes`, but stop coercing metadata codes that don't map (write the raw NRS code back).
- `src/pages/tenant/CreateInvoice.tsx` — `LineDraft.tax_category: string`; pass through raw NRS values from the picked product without narrowing.
- `src/layouts/TenantLayout.tsx` — when auth is ready and `companyId` is null, render `<CompanyOnboarding />` instead of the sidebar/outlet.
- `src/pages/tenant/onboarding/CompanyOnboarding.tsx` (new) — Business Name, TIN, Location form; inserts into `companies`, `company_members`, `user_roles`, then calls `refreshMembership()`.

## Implementation order

1. **Database migration** (one call — user approves):
   - `ALTER TABLE public.products` add: `unit_code text default 'EA'`, `tax_category text default 'S'`, `item_classification_code text`, `hsn_code text`, `product_category text`.
   - `ALTER TABLE public.invoice_lines` add: `unit_code text default 'EA'`, `tax_category text default 'S'`, `tax_scheme text default 'VAT'`, `discount_amount numeric default 0`, `net_amount numeric`, `tax_amount numeric`, `item_classification_code text`, `hsn_code text`, `product_category text`.
   - `ALTER TABLE public.invoices` add: `invoice_type text default '380'`, `transaction_type text default 'B2B'`, `supply_date date`, `payment_terms text`, `payment_means_code text default '30'`, `exchange_rate numeric default 1`.
   - `CREATE TABLE public.nrs_master_data (resource_type text, code text, label text, metadata jsonb, primary key (resource_type, code))` — GRANT SELECT to `anon` + `authenticated`; RLS with public read policy (reference data). Seed baseline rows for `hs-codes`, `services-codes`, `unit-codes`, `tax-categories`, `currencies`, `invoice-types`, `payment-means`.
   - `CREATE TABLE public.nrs_submissions (invoice_id uuid, payload jsonb, validation_errors jsonb, result text, scenario text, mock boolean, created_by uuid, created_at timestamptz)` — GRANT to `authenticated`/`service_role`; RLS scoped through invoice → company membership.
   - `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`.
2. **Frontend type widening** — drop the `"S" | "Z" | "E" | "O"` unions in `ProductForm`, `CreateInvoice`, `useCreateInvoice`. Store whatever NRS returns.
3. **Onboarding component** — build the missing-company intercept in `TenantLayout` with a polished single-card form.
4. **Validation** — run `tsgo` build, click through Product create, Invoice create, and simulate a fresh signup (no company row) to confirm the onboarding path renders and creates the company.

## Design constraints

- No visual redesign of existing pages. Onboarding follows current card + `PageHeader`-less shell language.
- No PDF/Void/Duplicate work (out of scope).
- Reference data reads are safe to expose to `anon` (public codes); writes remain service-role.
- All new columns default so existing rows/inserts remain valid.

## Risk analysis

| Risk | Mitigation |
| --- | --- |
| Migration widening columns changes app types mid-flight | Types regenerate automatically after approval; frontend edits ship in the same turn. |
| Seed data collides with real government values | Use `on conflict (resource_type, code) do nothing` in inserts. |
| `on_auth_user_created` trigger fires for existing users | Trigger is `AFTER INSERT` only, so pre-existing users are unaffected. Existing accounts without a company will hit the new onboarding intercept. |
| Legacy enum consumers (`buildPayload`, `nrs-submit`) rely on S/Z/E/O | Payload builder already treats unknown categories as non-VAT; we keep NRS codes as raw strings and let the government API decide. |
| `nrs_submissions` RLS misconfigured → edge function 500s | Grant `ALL` to `service_role`; edge function uses service key. |

## Cache / manual actions

- None for browsers. After migration approval, Supabase types regenerate automatically. No user-side refresh required beyond a normal reload.

## Testing checklist (post-build)

- [ ] Add product with HS classification from dropdown → saves without schema error.
- [ ] Product picker with government `LOCAL_SALES_TAX` metadata saves raw category.
- [ ] Create invoice with line items → succeeds, lines carry `hsn_code`, `product_category`, `tax_category`.
- [ ] Fresh signup → onboarding card appears; submit → dashboard loads with zero-state.
- [ ] Existing users unaffected; dashboard KPIs render.
- [ ] `nrs-submit` insert into `nrs_submissions` no longer 404s.
