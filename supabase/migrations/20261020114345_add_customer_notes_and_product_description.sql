-- Add customer internal notes and product description columns

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text;
