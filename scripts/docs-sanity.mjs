// Lightweight sanity checks for the Docs Hub helpers. No test framework — run
// with `node scripts/docs-sanity.mjs`. Exits non-zero on failure.
import {
  DOC_TYPES,
  DEFAULT_DOC_TYPE,
  normalizeDocType,
  isValidDocUrl,
  docDomain,
  validateDocInput,
  filterDocs,
  countDocsByType,
} from '../src/lib/docs.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Doc types
assert(DOC_TYPES.length >= 1, 'there is at least one doc type')
assert(DEFAULT_DOC_TYPE === 'Other', 'the default doc type is Other')
assert(DOC_TYPES[DOC_TYPES.length - 1] === 'Other', 'Other is listed last')
assert(normalizeDocType('Tech Plan') === 'Tech Plan', 'a known type is passed through')
assert(normalizeDocType('Made Up') === 'Other', 'an unknown type coerces to Other')
assert(normalizeDocType(null) === 'Other', 'a null type coerces to Other')

// isValidDocUrl
assert(isValidDocUrl('https://docs.google.com/x') === true, 'https urls are valid')
assert(isValidDocUrl('http://example.com') === true, 'http urls are valid')
assert(isValidDocUrl('ftp://example.com') === false, 'ftp is rejected')
assert(isValidDocUrl('javascript:alert(1)') === false, 'javascript: is rejected')
assert(isValidDocUrl('mailto:a@b.com') === false, 'mailto: is rejected')
assert(isValidDocUrl('/relative/path') === false, 'relative paths are rejected')
assert(isValidDocUrl('not a url') === false, 'garbage is rejected')
assert(isValidDocUrl('') === false, 'empty string is rejected')
assert(isValidDocUrl(null) === false, 'null is rejected')

// docDomain
assert(docDomain('https://www.google.com/docs') === 'google.com', 'docDomain strips leading www.')
assert(docDomain('https://notion.so/page') === 'notion.so', 'docDomain reads the host')
assert(docDomain('not a url') === '', 'docDomain is empty for unparseable input')
assert(docDomain(null) === '', 'docDomain is empty for null')

// validateDocInput
const bad = validateDocInput({ title: '', url: '' })
assert(bad.ok === false, 'empty input is invalid')
assert(bad.errors.title && bad.errors.url, 'missing title and url both flagged')

const badUrl = validateDocInput({ title: 'Design', url: 'ftp://x' })
assert(badUrl.ok === false && badUrl.errors.url, 'a non-http url is flagged')

const longTitle = validateDocInput({ title: 'x'.repeat(201), url: 'https://a.io' })
assert(longTitle.ok === false && longTitle.errors.title, 'an overlong title is flagged')

const longDesc = validateDocInput({ title: 'A', url: 'https://a.io', description: 'x'.repeat(2001) })
assert(longDesc.ok === false && longDesc.errors.description, 'an overlong description is flagged')

const good = validateDocInput({
  title: '  Game Design Bible  ',
  url: '  https://docs.google.com/x  ',
  docType: 'Bogus',
  description: '  notes  ',
  projectId: 'p1',
})
assert(good.ok === true, 'a well-formed doc is valid')
assert(good.value.title === 'Game Design Bible', 'title is trimmed')
assert(good.value.url === 'https://docs.google.com/x', 'url is trimmed')
assert(good.value.docType === 'Other', 'an unknown type normalizes to Other')
assert(good.value.description === 'notes', 'description is trimmed')
assert(good.value.projectId === 'p1', 'projectId is carried through')
assert(good.value.taskId === null, 'taskId defaults to null')

const noProject = validateDocInput({ title: 'A', url: 'https://a.io', projectId: '' })
assert(noProject.value.projectId === null, 'a blank projectId becomes null')

// filterDocs
const docs = [
  { id: 'd1', title: 'Combat Design', docType: 'Game Design Document', projectId: 'p1' },
  { id: 'd2', title: 'Render Pipeline', docType: 'Tech Plan', projectId: 'p2' },
  { id: 'd3', title: 'Old Notes', docType: 'QA Notes', projectId: 'p1', archivedAt: '2026-07-01T00:00:00Z' },
  { id: 'd4', title: 'Loose Idea', docType: 'Other', projectId: null },
]
assert(filterDocs(docs).map((d) => d.id).join(',') === 'd1,d2,d4', 'archived docs are excluded by default')
assert(filterDocs(docs, { docType: 'Tech Plan' }).map((d) => d.id).join(',') === 'd2', 'type filter narrows results')
assert(filterDocs(docs, { projectId: 'p1' }).map((d) => d.id).join(',') === 'd1', 'project filter narrows results')
assert(filterDocs(docs, { projectId: 'none' }).map((d) => d.id).join(',') === 'd4', 'the "none" filter finds project-less docs')
assert(filterDocs(docs, { search: 'render' }).map((d) => d.id).join(',') === 'd2', 'search matches title case-insensitively')
assert(filterDocs(docs, { search: 'zzz' }).length === 0, 'a non-matching search returns nothing')
assert(filterDocs([]).length === 0, 'an empty list filters to nothing')

// countDocsByType
const counts = countDocsByType(docs)
assert(counts['Game Design Document'] === 1, 'counts a design doc')
assert(counts['Tech Plan'] === 1, 'counts a tech plan')
assert(counts['QA Notes'] === undefined, 'archived docs are not counted')
assert(counts['Other'] === 1, 'counts an other doc')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll docs sanity checks passed.')
