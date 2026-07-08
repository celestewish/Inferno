import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'must be set at build time — Vite inlines them into the client bundle. ' +
    'Locally, add them to a .env file (see .env.example). For IONOS Deploy Now, ' +
    'add them as repository secrets and confirm they are mapped in ' +
    '.github/workflows/Inferno-build.yaml.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
