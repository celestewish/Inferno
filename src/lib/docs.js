// Pure helpers for the Docs Hub (metadata-only registry of external documents).
// No React, no Supabase, so validation/filtering/formatting can be unit-tested
// with plain Node.

// Curated document types. 'Other' is the default and always last.
export const DOC_TYPES = [
  'Game Design Document',
  'Tech Plan',
  'Art Direction',
  'Narrative Bible',
  'QA Notes',
  'Postmortem',
  'Other',
]

const DOC_TYPE_SET = new Set(DOC_TYPES)

export const DEFAULT_DOC_TYPE = 'Other'

// Coerce any stored/incoming type to a known one so a bad value can never break
// filtering or badges.
export function normalizeDocType(type) {
  return DOC_TYPE_SET.has(type) ? type : DEFAULT_DOC_TYPE
}

// A doc link must be an absolute http(s) URL. We reject anything else (relative
// paths, javascript:, mailto:, ftp:, etc.) so opening a doc is always safe.
export function isValidDocUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

// Human-friendly domain for a doc card (host without a leading www.). Returns ''
// for anything unparseable so the caller can fall back to a generic label.
export function docDomain(url) {
  if (typeof url !== 'string') return ''
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Validate + normalize a doc form payload before it hits the database. Returns
// { ok, value?, errors? } where errors is keyed by field for inline messages.
export function validateDocInput(input = {}) {
  const errors = {}
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const docType = normalizeDocType(input.docType)

  if (!title) errors.title = 'Title is required.'
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters.'

  if (!url) errors.url = 'A link is required.'
  else if (!isValidDocUrl(url)) errors.url = 'Enter a valid http or https link.'

  if (description.length > 2000) errors.description = 'Keep the description under 2000 characters.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      title,
      url,
      description,
      docType,
      projectId: input.projectId || null,
      taskId: input.taskId || null,
    },
  }
}

// Filter docs by free-text title search, type, and project. Archived docs are
// excluded up front so the active list never shows a removed doc. Filters use
// the sentinel 'all' to mean "no filter".
export function filterDocs(docs = [], { search = '', docType = 'all', projectId = 'all' } = {}) {
  const list = Array.isArray(docs) ? docs : []
  const needle = search.trim().toLowerCase()
  return list.filter((doc) => {
    if (!doc || doc.archivedAt) return false
    if (docType !== 'all' && normalizeDocType(doc.docType) !== docType) return false
    if (projectId !== 'all') {
      if (projectId === 'none') {
        if (doc.projectId) return false
      } else if (doc.projectId !== projectId) {
        return false
      }
    }
    if (needle && !String(doc.title || '').toLowerCase().includes(needle)) return false
    return true
  })
}

// Count active (non-archived) docs by type, for the summary stats. Returns a map
// of docType -> count including only types that appear.
export function countDocsByType(docs = []) {
  const counts = {}
  for (const doc of Array.isArray(docs) ? docs : []) {
    if (!doc || doc.archivedAt) continue
    const type = normalizeDocType(doc.docType)
    counts[type] = (counts[type] || 0) + 1
  }
  return counts
}
