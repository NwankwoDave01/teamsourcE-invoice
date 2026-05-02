
## Context

I trust your confirmation that the additive NRS migration is live. I re-read all the forms and hooks. The good news: most of the wiring you asked for is already in place. There is **one real gap** plus one small visibility improvement.

### What's already correctly wired (no work needed)

- **Settings.tsx + `useUpdateCompany`** — saves `legal_name, rc_number, vat_number, email, phone, address_line1/2, city, state, lga, postcode, country_code, industry_code`. Hydrates from `company`.
- **CustomerForm.tsx + `useCreateCustomer` / `useUpdateCustomer`** — saves `buyer_type, rc_number, address_line1/2, state, lga, postcode, country_code` plus existing `email, phone, tin, city`. Hydrates from `existing`.
- **ProductForm.tsx + `useCreateProduct` / `useUpdateProduct`** — saves `unit_code, tax_category, item_classification_code`. Hydrates from `existing`.
- **CreateInvoice.tsx + `useCreateInvoice`** — saves the **header** fields `invoice_type, transaction_type, supply_date, payment_terms, payment_means_code, exchange_rate`.
- **`buildPayload.ts`** — already does `select("*")` on invoices/companies/customers/lines, so once the columns exist (your migration) and the forms save them, the preview will read **real saved values** automatically. No change needed there.

### The actual gap: invoice **line** NRS fields are dropped on save

In `CreateInvoice.tsx` the `LineDraft` type has only `description, qty, unit_price, tax_rate` and `useCreateInvoice` inserts the same minimal set. So even when the user picks a product whose `unit_code = "EA"` and `tax_category = "S"` are saved, none of that flows onto the invoice line, and the preview falls back to defaults for every line.

## Plan

### 1. Extend `LineDraft` and the line-pick handler (`src/pages/tenant/CreateInvoice.tsx`)
Add to `LineDraft`: `unit_code: string` (default `"EA"`), `tax_category: "S"|"Z"|"E"|"O"` (default `"S"`), `discount_amount: number` (default `0`), `item_classification_code: string | null` (default `null`).

In `pickProduct`, copy the product's `unit_code`, `tax_category`, `item_classification_code` onto the chosen line so users get correct values for free. No new UI fields; values flow from the product catalog.

Pass these fields into `createMut.mutateAsync({ lines: ... })`.

### 2. Extend `useCreateInvoice` line insert (`src/hooks/useCompanyData.ts`)
Extend the `lines` element type to include `unit_code, tax_category, discount_amount, item_classification_code` (all optional). In the `invoice_lines` insert payload, spread these — guarded with `as any` until Supabase regenerates types — and recompute `line_total` to subtract `discount_amount` before tax (`(qty * unit_price - discount) * (1 + tax_rate/100)`).

### 3. Tiny read-only addition in `InvoiceDetails.tsx`
Add an "NRS details" row in the existing detail panel showing `Invoice type`, `Transaction type`, `Supply date`, `Payment terms`, `Payment means`. No layout redesign — same card, two extra rows. This makes it obvious what the preview is about to consume.

### 4. No other changes
- No DB migration.
- No new pages, no homepage edits, no UI redesign.
- No NRS API call.
- No edit to `src/integrations/supabase/types.ts` (regenerated automatically; we keep the `as any` casts that are already there until it does).

### 5. TypeScript check
The harness runs typecheck after the edits. I'll fix anything that surfaces.

## What to test manually after the change

1. **Settings → Company tab**: fill `Registered legal name`, `RC number`, `Address line 1`, `City`, `State`, `Country code`. Save → reload page → all fields persist.
2. **Customers → New**: set `Buyer type = Business`, fill TIN, RC number, address line 1, state, country code. Save → reopen → fields persist.
3. **Products → New**: set `Unit code = EA`, `Tax category = S`, `Item classification = 1006.30`. Save → reopen → fields persist.
4. **Create Invoice**:
   - Pick the customer + product from steps 2/3.
   - Header: `Invoice type = Commercial`, `Transaction type = B2B`, `Supply date` = today, `Payment terms = Net 30`, `Payment means = 30 — Bank transfer`, `Exchange rate = 1`.
   - Confirm the line picks up the product's unit code / tax category internally.
   - Save the invoice.
5. **Invoice Details page**: confirm new "NRS details" rows show what you entered.
6. **Click "Preview NRS Payload"**:
   - **Validation tab**: 0 errors. Warnings (if any) should be about things you intentionally left blank — not about TIN/address/unit code on the data you just filled.
   - **JSON tab**, verify these reflect saved values:
     - `supplier.legalName`, `supplier.rcNumber`, `supplier.address.line1/state/countryCode` → from Settings.
     - `buyer.buyerType` = `business`, `buyer.rcNumber`, `buyer.address.*` → from the customer.
     - `lines[0].unitCode` = `EA`, `taxCategory` = `S`, `itemCode` = `1006.30`.
     - `invoiceTypeCode` = `380`, `transactionType` = `B2B`, `supplyDate` filled, `paymentMeansCode` = `30`, `paymentTerms` = `Net 30`.
7. **Negative case**: create a second customer with no address / no TIN, issue an invoice to them → preview should show TIN/address as **warnings** (lenient), not errors, and still produce a JSON payload.
8. **Backward compat**: open an old invoice created before the migration → it should still load, still preview, just with more warnings.

## Risks / notes

- `as any` casts remain in a couple of insert payloads until Supabase regenerates `types.ts`. They'll resolve themselves on next type sync. They don't affect runtime.
- No data is sent to NRS. Preview remains an internal UBL-style mapping, as agreed.
- If you do want the invoice line UI to also show editable `Unit code` / `Tax category` selectors per line (today they're only inherited from the picked product), say the word and I'll add them inside the existing line row — but the current request explicitly says "do not redesign UI" so I'm holding off.
