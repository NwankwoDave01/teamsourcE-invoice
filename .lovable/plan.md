## Add NRS-required fields to UI forms

Goal: expose every additive NRS column (already present in the database via the migration) to the existing Customer, Product, Settings, and Invoice forms — without changing layouts. All fields stay optional and backward compatible. After this, "Preview NRS Payload" will surface fewer warnings.

### 1. Customer form (`src/pages/tenant/customers/CustomerForm.tsx`)

Extend `FormState` with: `buyer_type`, `rc_number`, `address_line1`, `address_line2`, `state`, `lga`, `postcode`, `country_code` (default `NG`). Hydrate from `existing` in the `useEffect`.

Add fields into the existing `SectionCard`s — no new layout:

- **Business profile section** — add two new fields beside the existing TIN/City grid:
  - `Buyer type` (Select: business / individual / government / foreign)
  - `RC number` (Input, monospace)
- **New SectionCard "Registered address"** (icon `MapPin`) inserted between "Business profile" and "Primary contact":
  - Row 1: `Address line 1`, `Address line 2`
  - Row 2: `State`, `LGA`
  - Row 3: `Postcode`, `Country code` (default `NG`)

Include all new keys in the `create`/`update` mutation payload (the hooks already spread `Partial<DBCustomer>` — no hook changes needed).

### 2. Product form (`src/pages/tenant/products/ProductForm.tsx`)

Add state: `unitCode` (default `EA`), `taxCategory` (default `S`), `itemClassificationCode`. Hydrate from `existing`.

- **Item details section** — add `Item classification code (HS / CPC)` Input next to Category.
- **Pricing & tax section** — add two fields under the existing price/tax row:
  - `Unit code` (Select with common UN/ECE codes from `src/lib/nrs/codes.ts`: EA, KGM, LTR, HUR, etc., default EA)
  - `Tax category` (Select: S — Standard, Z — Zero-rated, E — Exempt, O — Out of scope)

Pass new keys into create/update mutations. Note: keep the existing `unit` (display label) field untouched to preserve invoice rendering — `unit_code` is the NRS-compliant code that lives alongside it.

### 3. Company Settings (`src/pages/tenant/Settings.tsx`)

Extend `form` state with: `legal_name`, `rc_number`, `vat_number`, `email`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `lga`, `postcode`, `country_code`, `industry_code`. Hydrate from `company`.

Inside the existing **Company** tab `Card` (no new tabs, no layout change):
- Replace the placeholder `Textarea` "Registered address" block with a structured grid containing the new fields, keeping the same 2-column layout used today.
- Add `Legal name`, `RC number`, `VAT number`, `Email`, `Phone` to the existing top grid.
- Add `Address line 1`, `Address line 2`, `City`, `State`, `LGA`, `Postcode`, `Country code`, `Industry code` in the same grid below.

`useUpdateCompany` already accepts `Partial<DBCompany>`, so `handleSave` just spreads the new keys.

### 4. Invoice — Create form (`src/pages/tenant/CreateInvoice.tsx`)

Add state: `invoiceType` (default `commercial`), `transactionType` (default `B2B`), `supplyDate`, `paymentTerms`, `paymentMeansCode` (default `30`), `exchangeRate` (default `1`).

Inside the existing **Customer & details** `SectionCard` grid:
- `Invoice type` (Select)
- `Transaction type` (Select)
- `Supply date` (date input)
- `Payment terms` (Input — free text e.g. "Net 30")
- `Payment means code` (Select: 30 Bank transfer / 10 Cash / 48 Card / 42 Cheque / 97 Other)
- `Exchange rate` (number input, default 1, hint "Required only for non-NGN")

Update `useCreateInvoice` (`src/hooks/useCompanyData.ts`) — extend the `input` type and the `.insert({...})` payload to include these six new columns. They're all nullable / have DB defaults, so existing callers/tests stay valid.

### 5. Codes helper

Reuse `src/lib/nrs/codes.ts` for option lists (unit codes, tax categories, payment means, invoice types, transaction types, buyer types). If a list is missing, add it there so all forms share one source of truth.

### Out of scope
- No layout redesign, no new pages, no new tabs.
- No required-field enforcement — everything stays optional.
- No changes to `InvoiceDetails`, the NRS preview dialog, the build/validate logic, or the database (the migration from the prior step already added every column).
- No edits to `src/integrations/supabase/types.ts` (auto-generated).

### Files touched
- `src/pages/tenant/customers/CustomerForm.tsx`
- `src/pages/tenant/products/ProductForm.tsx`
- `src/pages/tenant/Settings.tsx`
- `src/pages/tenant/CreateInvoice.tsx`
- `src/hooks/useCompanyData.ts` (extend `useCreateInvoice` input + insert)
- `src/lib/nrs/codes.ts` (add option lists if missing)

### Verification
- Run `bunx tsc --noEmit`.
- Manual: open each form, confirm new fields render inside the existing sections, save with new fields populated, then run "Preview NRS Payload" on a fresh invoice — warnings about missing TIN/address/codes should drop.
