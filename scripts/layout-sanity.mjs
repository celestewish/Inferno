// Static guard for the authenticated Campfire sidebar and Progress badge grid
// layouts. These two views regressed because their containers could not shrink
// (Campfire sidebar) or could not stretch (badge grid), so this script asserts
// the containment rules that keep them contained. No framework - run with
// `node scripts/layout-sanity.mjs`. Exits non-zero on failure.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '..', 'src', 'App.css'), 'utf8')

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Return the declaration body of the first rule whose selector list contains
// the exact selector token. Guards against matching a longer selector by
// requiring a delimiter (comma, whitespace, or brace) on both sides.
function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[,}])\\s*${escaped}\\s*(\\{)`, 'm')
  const start = css.search(re)
  if (start === -1) return null
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  if (open === -1 || close === -1) return null
  return css.slice(open + 1, close).replace(/\s+/g, ' ').trim()
}

const has = (selector, substr) => {
  const body = ruleBody(selector)
  return body !== null && body.includes(substr)
}

// ---------------------------------------------------------------------------
// Progress page badges (authenticated Settings > Progress panel)
// Root cause of the regression: `.settings-panel { justify-items: start }`
// stops the badge <ul> from stretching, so auto-fill collapsed to one column.
// The grid must declare full width so auto-fill can lay out real columns.
// ---------------------------------------------------------------------------
assert(ruleBody('.gami-badge-grid') !== null, '.gami-badge-grid rule exists')
assert(has('.gami-badge-grid', 'width: 100%'), '.gami-badge-grid stretches to full width (defeats justify-items: start)')
assert(
  has('.gami-badge-grid', 'repeat(auto-fill, minmax(140px, 1fr))'),
  '.gami-badge-grid is a responsive auto-fill grid',
)
assert(has('.settings-panel', 'justify-items: start'), '.settings-panel still uses justify-items: start (the width fix is required)')

// ---------------------------------------------------------------------------
// Campfire rooms sidebar (authenticated Campfire view)
// Root cause of the regression: the sidebar grid item and its inner grids kept
// their default min-width: auto, so un-shrinkable room rows forced the panel
// wider than the viewport and overflowed past the rounded edge. Every link in
// the grid chain must be allowed to shrink.
// ---------------------------------------------------------------------------
for (const sel of ['.campfire-rooms', '.campfire-room-groups', '.campfire-room-group', '.campfire-room-list']) {
  assert(has(sel, 'min-width: 0'), `${sel} can shrink (min-width: 0)`)
  assert(has(sel, 'minmax(0, 1fr)'), `${sel} uses a shrinkable column track`)
}
assert(has('.campfire-room-row', 'min-width: 0'), '.campfire-room-row can shrink')

// The room name absorbs the slack via ellipsis while flame/count stay fixed so
// the count pill can never be pushed outside the card.
assert(has('.campfire-room-name', 'min-width: 0'), '.campfire-room-name can shrink')
assert(has('.campfire-room-name', 'text-overflow: ellipsis'), '.campfire-room-name ellipsizes overflow')
assert(has('.campfire-room-count', 'flex: none'), '.campfire-room-count stays inside the card')
assert(has('.campfire-add-channel-btn', 'flex: none'), '.campfire-add-channel-btn holds its size')
assert(has('.campfire-room-group-name', 'min-width: 0'), '.campfire-room-group-name can shrink beside the Add button')

// The mobile layout track must also be shrinkable, not a bare 1fr.
assert(
  css.includes('.campfire-layout { grid-template-columns: minmax(0, 1fr); }'),
  'the mobile campfire layout track can shrink',
)

if (failures) {
  console.error(`\n${failures} layout check(s) failed.`)
  process.exit(1)
}
console.log('\nAll layout sanity checks passed.')
