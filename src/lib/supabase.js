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

// Build a readable one-line summary of a Supabase/PostgREST error for logs and
// UI. Includes code/message/details/hint when present but never any payload
// data, so it is safe to show to the user.
export function formatSupabaseError(error) {
  if (!error) return 'Unknown error'
  const parts = [error.code, error.message, error.details, error.hint]
  return parts.filter(Boolean).join(' — ') || 'Unknown error'
}

// A missing column usually means a migration has not been applied to the
// linked Supabase project yet (e.g. the profile-fields migration). PostgREST
// surfaces this as PGRST204; Postgres as 42703.
export function isMissingColumnError(error) {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === '42703') return true
  return /column .* does not exist/i.test(error.message ?? '')
}
