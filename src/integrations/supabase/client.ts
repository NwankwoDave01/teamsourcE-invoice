// Supabase client — pointed at personal Supabase project.
// Values are hardcoded (not read from .env) because Lovable Cloud auto-syncs
// the .env file. The publishable/anon key is safe to ship in client code.
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from './appSchema';

const SUPABASE_URL = new URL("/api/supabase", window.location.origin).toString();
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gHKdMJgMbPb7WCT3D-Ksig_VmqSCpE-";
const LEGACY_AUTH_STORAGE_KEY = "sb-nsfkeojunstyzueguzxx-auth-token";

try {
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key === LEGACY_AUTH_STORAGE_KEY || key?.startsWith(`${LEGACY_AUTH_STORAGE_KEY}-`)) {
      window.localStorage.removeItem(key);
    }
  }
} catch (error) {
  console.error("Could not clear the legacy browser auth session.", error);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<AppDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (input, init) => fetch(input, { ...init, credentials: "same-origin" }),
  },
});
