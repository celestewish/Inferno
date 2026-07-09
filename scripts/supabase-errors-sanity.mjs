// Lightweight sanity checks for the Supabase error classifiers. No test
// framework — run with `node scripts/supabase-errors-sanity.mjs`. Exits
// non-zero on failure.
import {
  formatSupabaseError,
  isMissingColumnError,
  isMissingTableError,
  isAccessError,
} from '../src/lib/supabaseErrors.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// formatSupabaseError
assert(formatSupabaseError(null) === 'Unknown error', 'null formats to Unknown error')
assert(
  formatSupabaseError({ code: '42501', message: 'permission denied for table board_docs' }).includes('permission denied'),
  'formats code and message',
)

// isMissingColumnError
assert(isMissingColumnError({ code: 'PGRST204' }) === true, 'PGRST204 is a missing column')
assert(isMissingColumnError({ code: '42703' }) === true, '42703 is a missing column')
assert(
  isMissingColumnError({ message: 'column "foo" does not exist' }) === true,
  'column-does-not-exist message is a missing column',
)
assert(isMissingColumnError({ code: '42501' }) === false, 'a permission error is not a missing column')

// isMissingTableError
assert(isMissingTableError({ code: 'PGRST205' }) === true, 'PGRST205 is a missing table')
assert(isMissingTableError({ code: '42P01' }) === true, '42P01 is a missing table')
assert(
  isMissingTableError({ message: 'Could not find the table public.board_docs in the schema cache' }) === true,
  'schema-cache message is a missing table',
)
assert(
  isMissingTableError({ message: 'relation "public.board_docs" does not exist' }) === true,
  'relation-does-not-exist message is a missing table',
)
assert(isMissingTableError({ code: '42501' }) === false, 'a permission error is not a missing table')

// isAccessError — this is the reported bug: a permission/RLS/session error must
// NOT be classified as a missing migration.
assert(
  isAccessError({ code: '42501', message: 'permission denied for table board_docs' }) === true,
  '42501 permission denied is an access error',
)
assert(isAccessError({ code: 'PGRST301' }) === true, 'PGRST301 (JWT) is an access error')
assert(isAccessError({ status: 401, message: 'JWT expired' }) === true, 'HTTP 401 is an access error')
assert(isAccessError({ status: 403 }) === true, 'HTTP 403 is an access error')
assert(
  isAccessError({ message: 'new row violates row-level security policy' }) === true,
  'row-level security message is an access error',
)
assert(isAccessError({ code: 'PGRST205' }) === false, 'a missing table is not an access error')
assert(isAccessError({ code: 'PGRST204' }) === false, 'a missing column is not an access error')

// The regression guard: the exact deployed error must route to access, not
// migration-missing.
const deployed = { code: '42501', status: 401, message: 'permission denied for table board_docs' }
assert(isAccessError(deployed) === true, 'deployed 42501/401 is an access error')
assert(isMissingTableError(deployed) === false, 'deployed 42501/401 is NOT a missing table')
assert(isMissingColumnError(deployed) === false, 'deployed 42501/401 is NOT a missing column')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll supabase error sanity checks passed.')
