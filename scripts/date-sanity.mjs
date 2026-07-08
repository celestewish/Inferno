// Lightweight sanity checks for the due-date helpers. No test framework — run
// with `node scripts/date-sanity.mjs`. Exits non-zero on failure.
import {
  formatDueLabel,
  isOverdue,
  parseDueDate,
  toISODate,
} from '../src/lib/dates.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// The reported bug: July 13, 2026 is a Monday, not Friday, and must not be
// flagged overdue. Year-less "Jul 13" used to parse to 2001 (a Friday).
const jul13 = parseDueDate('2026-07-13')
assert(jul13 && jul13.getDay() === 1, 'ISO 2026-07-13 parses to a Monday (getDay 1)')
assert(toISODate(jul13) === '2026-07-13', 'ISO round-trips through toISODate')

const yearless = parseDueDate('Jul 13')
const thisYear = new Date().getFullYear()
assert(
  yearless && yearless.getFullYear() === thisYear,
  `year-less "Jul 13" uses the current year (${thisYear}), not 2001`,
)

assert(parseDueDate('TBD') === null, '"TBD" is treated as no date')
assert(parseDueDate('') === null, 'empty string is no date')
assert(parseDueDate('someday soon') === null, 'ambiguous free text is not parsed')

// Overdue semantics (local date-only).
const today = new Date()
const iso = (d) => toISODate(d)
const plus = (days) => {
  const d = new Date(today)
  d.setDate(d.getDate() + days)
  return d
}
assert(isOverdue(iso(today)) === false, 'today is not overdue')
assert(isOverdue(iso(plus(1))) === false, 'tomorrow is not overdue')
assert(isOverdue(iso(plus(-1))) === true, 'yesterday is overdue')
assert(isOverdue(iso(plus(-1)), true) === false, 'completed past task is not overdue')
assert(isOverdue('someday soon') === false, 'unparseable text is never overdue')

const label = formatDueLabel('2026-07-13') ?? ''
assert(
  /Mon/.test(label) && /Jul/.test(label) && label.includes('13') && label.includes('2026'),
  `formatDueLabel includes Mon, Jul, 13, 2026 (got "${label}")`,
)

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll date sanity checks passed.')
