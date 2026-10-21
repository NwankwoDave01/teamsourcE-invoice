-- =============================================================================
-- Migration: Atomic Invoice and Invoice Lines Update RPC
-- Ensures invoice header and replacement line items are updated atomically
-- in a single transaction, preserving company isolation, row-locking the
-- invoice to prevent concurrent compliance status races, and requiring
-- invoice management permissions (matching "Finance can update invoices" RLS).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_invoice_atomic(
  p_invoice_id UUID,
  p_company_id UUID,
  p_header JSONB,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_line JSONB;
  v_pos INT := 0;
  v_desc TEXT;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_discount NUMERIC;
  v_discount_total NUMERIC := 0;
  v_tax_rate NUMERIC;
  v_cat TEXT;
  v_net NUMERIC;
  v_line_tax NUMERIC;
  v_line_total NUMERIC;
  v_subtotal NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_unit_code TEXT;
  v_customer_id UUID;
  v_product_id UUID;
  v_invoice_number TEXT;
  v_updated_invoice public.invoices%ROWTYPE;
BEGIN
  -- 1. Security / Authentication check
  IF auth.uid() IS NULL AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Authentication required to update invoices';
  END IF;

  -- 2. Fetch target invoice with row-level lock and verify company isolation
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_invoice.company_id != p_company_id THEN
    RAISE EXCEPTION 'Invoice does not belong to specified company %', p_company_id;
  END IF;

  -- 3. Verify invoice management permission (matches "Finance can update invoices" RLS policy)
  -- Requires company_admin, finance_officer, or super_admin; general members cannot edit invoices.
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.can_manage_invoices(auth.uid(), v_invoice.company_id) THEN
      RAISE EXCEPTION 'Access denied: user lacks invoice management permission for company %', v_invoice.company_id;
    END IF;
  END IF;

  -- 4. Enforce compliance protection: recheck locked row status to prevent concurrent edits during compliance processing
  IF v_invoice.status::text IN ('Submitted', 'Validated', 'Signed', 'Confirmed', 'Rejected') THEN
    RAISE EXCEPTION 'Cannot edit invoice in ''%'' stage. External compliance processing has begun.', v_invoice.status;
  END IF;

  -- 5. Validate header payload
  IF p_header IS NULL OR jsonb_typeof(p_header) != 'object' THEN
    RAISE EXCEPTION 'Invoice header must be a JSON object';
  END IF;

  IF NULLIF(trim(p_header->>'customer_name'), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF NULLIF(trim(p_header->>'issue_date'), '') IS NULL THEN
    RAISE EXCEPTION 'Issue date is required';
  END IF;

  IF NULLIF(trim(p_header->>'due_date'), '') IS NULL THEN
    RAISE EXCEPTION 'Due date is required';
  END IF;

  -- 5b. Verify customer belongs to the same company if customer_id is provided
  IF NULLIF(trim(p_header->>'customer_id'), '') IS NOT NULL THEN
    v_customer_id := (p_header->>'customer_id')::uuid;
    IF NOT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = v_customer_id AND company_id = p_company_id
    ) THEN
      RAISE EXCEPTION 'Customer % does not belong to company %', v_customer_id, p_company_id;
    END IF;
  ELSE
    v_customer_id := NULL;
  END IF;

  -- 6. Validate replacement lines upfront before any database mutations
  IF p_lines IS NULL OR jsonb_typeof(p_lines) != 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'At least one valid line item is required';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_pos := v_pos + 1;
    v_desc := trim(COALESCE(v_line->>'description', ''));
    IF v_desc = '' THEN
      RAISE EXCEPTION 'Line description cannot be empty (item position %)', v_pos;
    END IF;

    v_qty := (v_line->>'qty')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Line quantity must be greater than zero (item position %)', v_pos;
    END IF;

    v_unit_price := COALESCE((v_line->>'unit_price')::numeric, 0);
    IF v_unit_price < 0 THEN
      RAISE EXCEPTION 'Line unit price cannot be negative (item position %)', v_pos;
    END IF;

    v_discount := COALESCE((v_line->>'discount_amount')::numeric, 0);
    IF v_discount < 0 THEN
      RAISE EXCEPTION 'Line discount cannot be negative (item position %)', v_pos;
    END IF;

    IF v_discount > (v_qty * v_unit_price) THEN
      RAISE EXCEPTION 'Line discount cannot exceed line gross amount (item position %)', v_pos;
    END IF;

    v_tax_rate := COALESCE((v_line->>'tax_rate')::numeric, 0);
    IF v_tax_rate < 0 THEN
      RAISE EXCEPTION 'Line tax rate cannot be negative (item position %)', v_pos;
    END IF;

    -- Verify product belongs to the same company if product_id is provided
    IF NULLIF(trim(v_line->>'product_id'), '') IS NOT NULL THEN
      v_product_id := (v_line->>'product_id')::uuid;
      IF NOT EXISTS (
        SELECT 1 FROM public.products
        WHERE id = v_product_id AND company_id = p_company_id
      ) THEN
        RAISE EXCEPTION 'Product % does not belong to company % (item position %)', v_product_id, p_company_id, v_pos;
      END IF;
    END IF;

    v_cat := COALESCE(NULLIF(trim(v_line->>'tax_category'), ''), 'S');
    v_net := (v_qty * v_unit_price) - v_discount;
    IF v_cat IN ('Z', 'E', 'O') THEN
      v_line_tax := 0;
    ELSE
      v_line_tax := v_net * (v_tax_rate / 100.0);
    END IF;

    v_discount_total := v_discount_total + v_discount;
    v_subtotal := v_subtotal + v_net;
    v_tax := v_tax + v_line_tax;
  END LOOP;

  v_total := v_subtotal + v_tax;

  -- 7. Update invoice header while preserving existing system-managed and identity fields
  v_invoice_number := COALESCE(NULLIF(trim(p_header->>'number'), ''), v_invoice.number);
  IF v_invoice_number IS NULL OR v_invoice_number = '' THEN
    RAISE EXCEPTION 'Invoice number cannot be empty';
  END IF;

  UPDATE public.invoices
  SET
    number = v_invoice_number,
    customer_id = v_customer_id,
    customer_name = trim(p_header->>'customer_name'),
    issue_date = (p_header->>'issue_date')::date,
    due_date = (p_header->>'due_date')::date,
    notes = NULLIF(trim(p_header->>'notes'), ''),
    po_reference = NULLIF(trim(p_header->>'po_reference'), ''),
    subtotal = v_subtotal,
    tax = v_tax,
    total = v_total,
    discount_total = v_discount_total,
    taxable_amount = v_subtotal,
    invoice_type = COALESCE(NULLIF(trim(p_header->>'invoice_type'), ''), v_invoice.invoice_type),
    transaction_type = COALESCE(NULLIF(trim(p_header->>'transaction_type'), ''), v_invoice.transaction_type),
    supply_date = CASE WHEN NULLIF(trim(p_header->>'supply_date'), '') IS NOT NULL THEN (p_header->>'supply_date')::date ELSE v_invoice.supply_date END,
    payment_terms = COALESCE(NULLIF(trim(p_header->>'payment_terms'), ''), v_invoice.payment_terms),
    payment_means_code = COALESCE(NULLIF(trim(p_header->>'payment_means_code'), ''), v_invoice.payment_means_code),
    exchange_rate = COALESCE((p_header->>'exchange_rate')::numeric, v_invoice.exchange_rate),
    currency = COALESCE(NULLIF(trim(p_header->>'currency'), ''), v_invoice.currency),
    updated_at = now()
  WHERE id = p_invoice_id AND company_id = p_company_id
  RETURNING * INTO v_updated_invoice;

  -- 8. Delete existing lines (within the same atomic transaction)
  DELETE FROM public.invoice_lines
  WHERE invoice_id = p_invoice_id;

  -- 9. Insert replacement lines
  v_pos := 0;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_desc := trim(v_line->>'description');
    v_qty := (v_line->>'qty')::numeric;
    v_unit_price := COALESCE((v_line->>'unit_price')::numeric, 0);
    v_discount := COALESCE((v_line->>'discount_amount')::numeric, 0);
    v_tax_rate := COALESCE((v_line->>'tax_rate')::numeric, 0);
    v_cat := COALESCE(NULLIF(trim(v_line->>'tax_category'), ''), 'S');
    v_net := (v_qty * v_unit_price) - v_discount;
    IF v_cat IN ('Z', 'E', 'O') THEN
      v_line_tax := 0;
    ELSE
      v_line_tax := v_net * (v_tax_rate / 100.0);
    END IF;
    v_line_total := v_net + v_line_tax;
    v_unit_code := upper(COALESCE(NULLIF(trim(v_line->>'unit_code'), ''), 'EA'));

    IF NULLIF(trim(v_line->>'product_id'), '') IS NOT NULL THEN
      v_product_id := (v_line->>'product_id')::uuid;
    ELSE
      v_product_id := NULL;
    END IF;

    INSERT INTO public.invoice_lines (
      invoice_id,
      product_id,
      description,
      qty,
      unit_price,
      tax_rate,
      line_total,
      position,
      net_amount,
      tax_amount,
      taxable_amount,
      discount_amount,
      unit_code,
      tax_category,
      tax_scheme,
      item_classification_code,
      hsn_code,
      product_category
    ) VALUES (
      p_invoice_id,
      v_product_id,
      v_desc,
      v_qty,
      v_unit_price,
      v_tax_rate,
      v_line_total,
      v_pos,
      v_net,
      v_line_tax,
      v_net,
      v_discount,
      v_unit_code,
      v_cat,
      'VAT',
      NULLIF(trim(v_line->>'item_classification_code'), ''),
      NULLIF(trim(v_line->>'hsn_code'), ''),
      NULLIF(trim(v_line->>'product_category'), '')
    );

    v_pos := v_pos + 1;
  END LOOP;

  RETURN to_jsonb(v_updated_invoice);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_invoice_atomic(UUID, UUID, JSONB, JSONB) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.update_invoice_atomic(UUID, UUID, JSONB, JSONB) FROM anon, public;
