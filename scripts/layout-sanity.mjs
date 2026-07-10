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

// ---------------------------------------------------------------------------
// App shell viewport lock (authenticated app only)
// Root cause of the regression: `.app-shell { min-height: 100vh }` plus a
// sticky sidebar let the whole document grow and scroll, so main content could
// scroll away and leave a blank background beside the fixed sidebar. The outer
// wrapper must be exactly one screen tall and clip its overflow, and the shell,
// sidebar, and board area must scroll internally instead of the page as a whole.
// ---------------------------------------------------------------------------
assert(ruleBody('.app-viewport') !== null, '.app-viewport rule exists')
assert(has('.app-viewport', '100dvh'), '.app-viewport is one dynamic-viewport tall (100dvh)')
assert(has('.app-viewport', 'overflow: hidden'), '.app-viewport clips its own overflow (no whole-document scroll)')
assert(has('.app-viewport', 'flex-direction: column'), '.app-viewport is a vertical flex container')

assert(has('.app-shell', 'min-height: 0'), '.app-shell can shrink inside the viewport (min-height: 0)')
assert(has('.app-shell', 'overflow: hidden'), '.app-shell clips overflow so its rows scroll internally')
assert(has('.app-shell', 'flex: 1'), '.app-shell fills the remaining viewport height')
assert(has('.app-shell', 'grid-template-rows: minmax(0, 1fr)'), '.app-shell uses a single shrinkable full-height row')

assert(has('.board-area', 'overflow-y: auto'), '.board-area scrolls its own content instead of the document')
assert(has('.board-area', 'min-height: 0'), '.board-area can shrink so its scroll engages (min-height: 0)')

// ---------------------------------------------------------------------------
// Campfire full-height mode (desktop >= 961px)
// The header must not push the columns below the fold; the message list scrolls
// internally so the composer stays reachable without scrolling the page.
// ---------------------------------------------------------------------------
assert(has('.board-area-flush', 'display: flex'), '.board-area-flush is a flex column that hands height to campfire')
assert(has('.board-area-flush', 'overflow: hidden'), '.board-area-flush drops its own scroll')
assert(has('.board-area-flush .campfire-view', 'flex: 1'), 'campfire view fills the board area height')
assert(has('.board-area-flush .campfire-view', 'min-height: 0'), 'campfire view can shrink (min-height: 0)')
assert(has('.board-area-flush .campfire-layout', 'flex: 1'), 'campfire layout fills remaining height below the header')
assert(has('.board-area-flush .campfire-layout', 'min-height: 0'), 'campfire layout can shrink (min-height: 0)')
assert(has('.board-area-flush .campfire-feed-wrap', 'min-height: 0'), 'campfire feed wrap can shrink so the list scrolls, not the page')
assert(has('.board-area-flush .campfire-feed-wrap', 'overflow: hidden'), 'campfire feed wrap clips so only the message list scrolls')
assert(has('.board-area-flush .campfire-messages', 'flex: 1'), 'campfire message list takes the remaining height')
assert(has('.board-area-flush .campfire-messages', 'min-height: 0'), 'campfire message list can shrink to enable its scroll')
assert(has('.board-area-flush .campfire-messages', 'max-height: none'), 'campfire message list drops the 52vh cap in full-height mode')

// ---------------------------------------------------------------------------
// JSX wiring: the CSS above only helps if the authenticated app actually mounts
// the wrapper class and toggles the flush modifier for the Campfire section.
// ---------------------------------------------------------------------------
const jsx = readFileSync(join(here, '..', 'src', 'App.jsx'), 'utf8')
assert(jsx.includes('className="app-viewport"'), 'App.jsx wraps the authenticated app in .app-viewport')
assert(jsx.includes('board-area-flush'), 'App.jsx applies the board-area-flush modifier')
assert(
  /activeSection === 'campfire'\s*\?\s*' board-area-flush'/.test(jsx),
  'App.jsx toggles board-area-flush only on the Campfire section',
)

// ---------------------------------------------------------------------------
// Condensed desktop sidebar rail (>= 901px, .sidebar.app-nav.is-collapsed)
// Root cause of the regression: the base .sidebar sets overflow-y: auto, which
// forces overflow-x to compute to auto; combined with wide children (search
// label, kbd hint, board switcher) that were never hidden in the 76px rail,
// this produced an ugly horizontal scrollbar and clipped content. The collapsed
// rail must clip horizontally, hide its native scrollbar, hide the wide
// children, and center the search icon.
// ---------------------------------------------------------------------------
assert(has('.sidebar.app-nav.is-collapsed', 'overflow-x: hidden'), 'collapsed rail clips horizontal overflow (no horizontal scrollbar)')
assert(has('.sidebar.app-nav.is-collapsed', 'scrollbar-width: none'), 'collapsed rail hides the native scrollbar (Firefox)')
assert(
  has('.sidebar.app-nav.is-collapsed::-webkit-scrollbar', 'width: 0'),
  'collapsed rail zeroes the WebKit scrollbar so no native bar paints over icons',
)
for (const child of ['.app-nav-search-label', '.app-nav-kbd', '.board-switcher', '.project-switcher', '.stats-panel', '.app-nav-account']) {
  assert(
    css.includes(`.sidebar.app-nav.is-collapsed ${child}`),
    `collapsed rail hides wide child ${child}`,
  )
}
assert(has('.sidebar.app-nav.is-collapsed .app-nav-search', 'justify-content: center'), 'collapsed rail centers the search icon')
assert(has('.sidebar.app-nav.is-collapsed .app-nav-item', 'justify-content: center'), 'collapsed rail centers nav item icons')

if (failures) {
  console.error(`\n${failures} layout check(s) failed.`)
  process.exit(1)
}
console.log('\nAll layout sanity checks passed.')
