import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/config/integration";

/**
 * Client Supabase — activ doar dacă REACT_APP_SUPABASE_URL + ANON_KEY sunt setate în .env.
 * Dacă nu sunt setate, exportă `null` (frontend-ul rulează pe backend-ul demo).
 */
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } })
  : null;

export default supabase;
