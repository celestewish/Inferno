// Centralized due-date helpers. Task `due` values are stored as free text, but
// dates selected through the UI are canonical ISO local date strings
// (YYYY-MM-DD). Everything here treats such strings as *local calendar dates*,
// never UTC instants, to avoid the classic off-by-one timezone shift.

const localMidnight = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

// Parse a due value into a local Date at midnight, or null if not confidently
// parseable.
//
// Root-cause note: native `new Date("Jul 13")` does NOT return Invalid Date —
// it defaults year-less input to 2001 ("Fri Jul 13 2001"), which yields a wrong
// weekday and a false "overdue". So we only hand year-less free text to the
// parser after appending the current year.
export function parseDueDate(due) {
  if (due == null) return null
  const raw = String(due).trim()
  if (!raw || /^tbd$/i.test(raw)) return null

  // ISO date-only (YYYY-MM-DD): build from parts so it stays local midnight.
  // `new Date('2026-07-13')` is parsed as UTC and shifts a day back in
  // negative-offset timezones.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const [, y, m, d] = iso
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : date
  }

  // Only trust free text that actually looks like a date. The native parser is
  // lenient enough to turn junk into a valid Date ("someday soon 2026" →
  // Jan 1 2026), so we gate on a month name or a numeric date pattern in the
  // *raw* string before parsing. Anything else is left unparsed so callers can
  // preserve the original text and never flag it overdue.
  const MONTH_NAME = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i
  const NUMERIC_DATE = /^\s*\d{1,4}[/.-]\d{1,2}(?:[/.-]\d{1,4})?\s*$/
  if (!MONTH_NAME.test(raw) && !NUMERIC_DATE.test(raw)) return null

  // Year-less input ("Jul 13", "7/13") parses to a 2001 default in the native
  // parser, giving a wrong weekday and a false "overdue" — append the current
  // year so it lands in the intended one.
  const hasYear = /\b\d{4}\b/.test(raw)
  const candidate = hasYear ? raw : `${raw} ${new Date().getFullYear()}`
  const parsed = new Date(candidate)
  return Number.isNaN(parsed.getTime()) ? null : localMidnight(parsed)
}

// Canonical storage form: YYYY-MM-DD from local parts.
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

export function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// Friendly label such as "Mon, Jul 13, 2026" (local). Returns null when the
// value cannot be parsed so callers can fall back to the raw text.
export function formatDueLabel(due) {
  const date = parseDueDate(due)
  if (!date) return null
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Compact label for a Date (no year): "Mon, Jul 13".
export function formatDayLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// Overdue only when the due date is confidently parseable, in the past
// (local date-only comparison), and the task isn't complete. Ambiguous /
// unparseable text is never overdue.
export function isOverdue(due, completed = false) {
  if (completed) return false
  const date = parseDueDate(due)
  if (!date) return false
  return date < startOfToday()
}
