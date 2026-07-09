// Pure classification helpers for Supabase/PostgREST errors. Kept free of any
// client/env side effects so they can be unit-tested in Node and reused by both
// the Supabase client module and UI error handling.

// Build a readable one-line summary of a Supabase/PostgREST error for logs and
// UI. Includes code/message/details/hint when present but never any payload
// data, so it is safe to show to the user.
export function formatSupabaseError(error) {
  if (!error) return 'Unknown error'
  const parts = [error.code, error.message, error.details, error.hint]
  return parts.filter(Boolean).join(' — ') || 'Unknown error'
}

// A missing column usually means a migration has not been applied to the linked
// Supabase project yet. PostgREST surfaces this as PGRST204; Postgres as 42703.
export function isMissingColumnError(error) {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === '42703') return true
  return /column .* does not exist/i.test(error.message ?? '')
}

// A missing table (or one not yet visible in PostgREST's schema cache) means the
// migration that creates it has not been applied. PostgREST surfaces this as
// PGRST205 ("Could not find the table ... in the schema cache"); Postgres as
// 42P01 ("relation ... does not exist"). This is distinct from a permission or
// RLS error on a table that DOES exist.
export function isMissingTableError(error) {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  const message = error.message ?? ''
  if (/could not find the table .* in the schema cache/i.test(message)) return true
  if (/relation .* does not exist/i.test(message)) return true
  return false
}

// A permission / RLS / not-signed-in error means the table exists but the
// current role may not access it: a missing GRANT (Postgres 42501, "permission
// denied for table ..."), an RLS policy rejecting the row, or an expired/absent
// session (PostgREST PGRST301, or HTTP 401/403). Explicitly NOT a missing
// migration, so callers should avoid telling the user to run migrations here.
export function isAccessError(error) {
  if (!error) return false
  if (isMissingTableError(error) || isMissingColumnError(error)) return false
  if (error.code === '42501' || error.code === 'PGRST301') return true
  if (error.status === 401 || error.status === 403) return true
  return /permission denied|row-level security|not authorized|jwt/i.test(error.message ?? '')
}
