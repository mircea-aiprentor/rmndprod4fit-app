import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Lipsesc variabilele VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Verifică fișierul .env.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
