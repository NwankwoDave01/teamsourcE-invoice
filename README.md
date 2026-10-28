# Welcome to your Lovable project

TODO: Document your project here

## Authentication CAPTCHA

Sign-in and the existing signup form use Cloudflare Turnstile through Supabase Auth.
Set the public `VITE_TURNSTILE_SITE_KEY` environment variable in Vercel for each
deployment environment. Configure the Cloudflare widget's allowed hostnames for
the production domain and any Vercel preview or local development hosts in use.

The Turnstile secret key belongs only in Supabase Auth CAPTCHA settings and must
never be exposed in a `VITE_` variable. Public self-service signup remains subject
to the existing Supabase project configuration; invitation acceptance keeps its
existing verification, password setup, and membership activation flow.
