-- Add missing NRS portal credential columns to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS nrs_portal_email text,
  ADD COLUMN IF NOT EXISTS nrs_portal_password text;
