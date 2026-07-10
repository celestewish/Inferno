// Lightweight sanity checks for the shared URL guards. No test framework. Run
// with `node scripts/url-sanity.mjs`. Exits non-zero on failure.
import { isHttpUrl, safeImageUrl } from '../src/lib/url.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// isHttpUrl accepts only absolute http(s)
assert(isHttpUrl('https://example.com/a.png') === true, 'https urls are accepted')
assert(isHttpUrl('http://example.com/a.png') === true, 'http urls are accepted')
assert(isHttpUrl('  https://example.com  ') === true, 'surrounding whitespace is tolerated')
assert(isHttpUrl('javascript:alert(1)') === false, 'javascript: is rejected')
assert(isHttpUrl('data:image/png;base64,AAAA') === false, 'data: is rejected')
assert(isHttpUrl('ftp://example.com/a.png') === false, 'ftp: is rejected')
assert(isHttpUrl('mailto:a@b.com') === false, 'mailto: is rejected')
assert(isHttpUrl('/relative/avatar.png') === false, 'relative paths are rejected')
assert(isHttpUrl('not a url') === false, 'garbage is rejected')
assert(isHttpUrl('') === false, 'empty string is rejected')
assert(isHttpUrl(null) === false, 'null is rejected')
assert(isHttpUrl(undefined) === false, 'undefined is rejected')

// safeImageUrl returns the trimmed url when safe, otherwise ''
assert(safeImageUrl('https://example.com/a.png') === 'https://example.com/a.png', 'a safe url passes through')
assert(safeImageUrl('  https://example.com/a.png  ') === 'https://example.com/a.png', 'a safe url is trimmed')
assert(safeImageUrl('javascript:alert(1)') === '', 'a javascript: url is dropped')
assert(safeImageUrl('data:image/png;base64,AAAA') === '', 'a data: url is dropped')
assert(safeImageUrl('') === '', 'empty stays empty')
assert(safeImageUrl(null) === '', 'null becomes empty')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll url sanity checks passed.')
