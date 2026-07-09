// Sanity checks for the task-level code/docs link helpers. Run with
// `node scripts/tasklinks-sanity.mjs`. Exits non-zero on failure.
import {
  buildCodeRef,
  buildDocRef,
  addRef,
  removeRef,
  CODE_REF_MAX,
  DOC_REF_MAX,
} from '../src/lib/tasklinks.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// buildCodeRef
const pr = buildCodeRef({ url: 'https://github.com/studio/ember/pull/42' })
assert(pr.ok && pr.value.type === 'pull', 'buildCodeRef parses a PR URL type')
assert(pr.value.label === 'studio/ember #42', 'buildCodeRef derives a default label with number')
assert(Boolean(pr.value.id), 'buildCodeRef assigns an id')

const repo = buildCodeRef({ url: 'https://github.com/studio/ember', label: 'Main repo' })
assert(repo.ok && repo.value.type === 'repo', 'buildCodeRef parses a repo URL')
assert(repo.value.label === 'Main repo', 'buildCodeRef keeps an explicit label')

const nonGh = buildCodeRef({ url: 'https://gitlab.com/studio/ember' })
assert(nonGh.ok && nonGh.value.type === 'other', 'buildCodeRef accepts non-GitHub http links as other')

assert(buildCodeRef({ url: '' }).ok === false, 'buildCodeRef rejects empty url')
assert(buildCodeRef({ url: 'javascript:alert(1)' }).ok === false, 'buildCodeRef rejects unsafe url')

// buildDocRef
const doc = buildDocRef({ url: 'https://docs.google.com/document/d/abc', title: 'GDD' })
assert(doc.ok && doc.value.title === 'GDD', 'buildDocRef keeps an explicit title')
const doc2 = buildDocRef({ url: 'https://notion.so/page' })
assert(doc2.ok && doc2.value.title === 'notion.so', 'buildDocRef falls back to domain title')
assert(buildDocRef({ url: 'ftp://x' }).ok === false, 'buildDocRef rejects non-http url')

// addRef / removeRef
let list = []
const a1 = addRef(list, pr.value, CODE_REF_MAX)
assert(a1.ok && a1.list.length === 1, 'addRef appends a ref')
list = a1.list
const dup = addRef(list, { ...pr.value, id: 'other' }, CODE_REF_MAX)
assert(dup.ok === false, 'addRef rejects duplicate url')

const full = Array.from({ length: CODE_REF_MAX }, (_, i) => ({ id: `r${i}`, url: `https://github.com/x/y${i}` }))
assert(addRef(full, repo.value, CODE_REF_MAX).ok === false, 'addRef enforces the max')

const removed = removeRef(list, pr.value.id)
assert(removed.length === 0, 'removeRef drops the matching id')
assert(removeRef(null, 'x').length === 0, 'removeRef tolerates non-arrays')

assert(DOC_REF_MAX > 0 && CODE_REF_MAX > 0, 'limits are positive')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll task-links helper checks passed.')
