import { createClient } from '@supabase/supabase-js'

// Re-export the pure error classifiers so existing import sites keep working.
// They live in a side-effect-free module so they can be unit-tested in Node
// (this module throws on import there because it reads import.meta.env).
export {
  formatSupabaseError,
  isMissingColumnError,
  isMissingTableError,
  isAccessError,
} from './supabaseErrors.js'

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
