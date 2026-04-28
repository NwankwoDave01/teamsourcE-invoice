// Supabase client — pointed at personal Supabase project.
// Values are hardcoded (not read from .env) because Lovable Cloud auto-syncs
// the .env file. The publishable/anon key is safe to ship in client code.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nsfkeojunstyzueguzxx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gHKdMJgMbPb7WCT3D-Ksig_VmqSCpE-";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
