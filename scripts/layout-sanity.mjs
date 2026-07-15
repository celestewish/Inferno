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
// Regressions guarded here:
//  - the rail scrolled off the top of the page when the main area scrolled, so
//    it must stay pinned (position: sticky, top: 0, full viewport height);
//  - the lower INSIGHTS icons were unreachable, so the nav menu must own an
//    internal vertical scroll region (flex: 1 + min-height: 0 + overflow-y);
//  - un-hidden wide children (search label, kbd hint, board switcher) plus the
//    base overflow-y: auto produced a horizontal scrollbar and clipped content,
//    so the rail clips its own overflow and hides those children.
// ---------------------------------------------------------------------------
const collapsedRail = ruleBody('.sidebar.app-nav.is-collapsed')
assert(collapsedRail !== null, '.sidebar.app-nav.is-collapsed rule exists')
assert(has('.sidebar.app-nav.is-collapsed', 'position: sticky'), 'collapsed rail is pinned (position: sticky) so it cannot scroll off screen')
assert(has('.sidebar.app-nav.is-collapsed', 'top: 0'), 'collapsed rail sticks to the top of the viewport')
assert(has('.sidebar.app-nav.is-collapsed', 'height: 100dvh'), 'collapsed rail spans the full viewport height')
assert(has('.sidebar.app-nav.is-collapsed', 'overflow: hidden'), 'collapsed rail clips its own overflow (no horizontal scrollbar, no native bar over icons)')

// The nav menu is the single internal scroll region so every icon stays reachable.
assert(has('.sidebar.app-nav.is-collapsed .app-nav-menu', 'overflow-y: auto'), 'collapsed nav menu scrolls internally so all icons are reachable')
assert(has('.sidebar.app-nav.is-collapsed .app-nav-menu', 'min-height: 0'), 'collapsed nav menu can shrink to enable its scroll (min-height: 0)')
assert(has('.sidebar.app-nav.is-collapsed .app-nav-menu', 'flex: 1'), 'collapsed nav menu takes the remaining rail height')
assert(has('.sidebar.app-nav.is-collapsed .app-nav-menu', 'overflow-x: hidden'), 'collapsed nav menu never scrolls horizontally')

// .board-project-panel is the unified Boards/Projects switcher (a later design
// push merged the old .board-switcher and .project-switcher panels into it). If
// the collapsed rail does not hide it, its tabs and the active board/project
// row bleed out of the narrow rail, so the hidden list must name the CURRENT
// panel class, not the retired ones.
for (const child of ['.app-nav-label', '.app-nav-search-label', '.app-nav-kbd', '.board-project-panel', '.stats-panel', '.app-nav-account']) {
  assert(
    css.includes(`.sidebar.app-nav.is-collapsed ${child}`),
    `collapsed rail hides wide child ${child}`,
  )
}
assert(has('.sidebar.app-nav.is-collapsed .app-nav-search', 'justify-content: center'), 'collapsed rail centers the search icon')
assert(has('.sidebar.app-nav.is-collapsed .app-nav-item', 'justify-content: center'), 'collapsed rail centers nav item icons')

// ---------------------------------------------------------------------------
// Collapsed nav accessibility: the visible text label is hidden in the rail, so
// each nav/search button must carry an accessible name (aria-label) and a
// tooltip (title) that survives the hidden text.
// ---------------------------------------------------------------------------
const sidebarJsx = readFileSync(join(here, '..', 'src', 'components', 'ProjectSidebar.jsx'), 'utf8')
assert(sidebarJsx.includes('aria-label={item.label}'), 'each nav button has an accessible name (aria-label) even when text is hidden')
assert(sidebarJsx.includes('title={item.label}'), 'each nav button has a tooltip (title) in the collapsed rail')
assert(/className="app-nav-search"[\s\S]*?aria-label="Search"/.test(sidebarJsx), 'the search button has an accessible name when its label is hidden')
assert(/className="app-nav-search"[\s\S]*?title="Search"/.test(sidebarJsx), 'the search button has a tooltip in the collapsed rail')

// The collapsed-rail hide list above targets .board-project-panel; assert the
// sidebar actually renders that class so a future rename can't silently reopen
// the bleed (the CSS check alone would stay green against a stale class name).
assert(sidebarJsx.includes('board-project-panel'), 'sidebar renders the .board-project-panel switcher that the collapsed rail hides')

// ---------------------------------------------------------------------------
// Auth modal overlay must stay fixed over the viewport
// Root cause of the scroll-to-bottom bug: the glass pass grouped .auth-overlay
// into a `position: relative; isolation: isolate` rule meant only for the
// full-page shells. That later rule overrode the overlay's base
// `position: fixed`, so the modal fell into normal document flow at the bottom
// of the long landing page; focusing the email input on open then scrolled the
// whole page to the bottom. The overlay must never be positioned relative.
// (Scans every `.auth-overlay {` block, including grouped selectors.)
// ---------------------------------------------------------------------------
const authOverlayBlocks = css.match(/(?:^|[,}])\s*\.auth-overlay\s*\{[^}]*\}/gm) || []
assert(authOverlayBlocks.length > 0, '.auth-overlay rule exists')
assert(
  authOverlayBlocks.some((block) => /position:\s*fixed/.test(block)),
  '.auth-overlay is fixed over the viewport (modal centers, no page scroll)',
)
assert(
  !authOverlayBlocks.some((block) => /position:\s*relative/.test(block)),
  '.auth-overlay never uses position: relative (would drop the modal into page flow)',
)
// Opening the modal must not scroll the page to the focused input.
assert(jsx.includes('focus({ preventScroll: true })'), 'AuthModal focuses the email input with preventScroll')

// ---------------------------------------------------------------------------
// Shared .panel must not clip its children (sidebar + board top sections)
// Root cause of the persistent overflow: the liquid-glass pass appended
// `.panel { overflow: hidden }`. `.panel` is shared by the sidebar Stats /
// Boards / Projects switchers and the board's Today's Quests (.focus-quests)
// and Boss Fights (.boss-panel) sections. Because there is no `.panel::before`
// decoration to contain, that clip only cut off child :focus-visible outlines,
// hover glows, and content flush to the rounded corners, which read as the
// clipped/crowded pills and partly-hidden controls. `.panel` must never set
// overflow: hidden. (Scans every `.panel {` block, not just the first rule.)
// ---------------------------------------------------------------------------
const panelBlocks = css.match(/(?:^|[,}])\s*\.panel\s*\{[^}]*\}/gm) || []
assert(panelBlocks.length > 0, '.panel rule exists')
assert(
  !panelBlocks.some((block) => /overflow:\s*hidden/.test(block)),
  '.panel never sets overflow: hidden (would clip sidebar/board panel content)',
)

// The count badge beside a section heading (Boards / Projects) must hold its
// size and never be squeezed or clipped, and the heading absorbs slack via
// ellipsis so it cannot push the badge out.
assert(has('.column-header span, .section-heading span', 'flex: none'), 'section-heading count badge holds its size (flex: none)')
assert(has('.column-header span, .section-heading span', 'min-width: 2rem'), 'section-heading count badge reserves a circle/pill min-width')
assert(has('.section-heading h2', 'text-overflow: ellipsis'), 'section-heading title ellipsizes instead of pushing the badge out')

// Studio Home cards even out to the tallest sibling without stretching the game
// board task cards (scoped via the child combinator).
assert(has('.studio-grid', 'align-items: stretch'), '.studio-grid rows stretch so cards match heights')
assert(has('.studio-grid > .studio-card', 'height: 100%'), 'Studio Home cards fill row height (scoped to direct children)')

// ---------------------------------------------------------------------------
// Stats block columns carry no individual gradient tile
// The stat columns live inside the glass .stats-panel container, so each
// column (.stats-panel > div) must not paint its own gradient square behind the
// number/label. The glass tile treatment stays on the standalone .mini-stat.
// ---------------------------------------------------------------------------
const statColumnBlocks = css.match(/(?:^|[,}])\s*\.stats-panel > div\s*\{[^}]*\}/gm) || []
assert(statColumnBlocks.length > 0, '.stats-panel > div rule exists')
assert(
  !statColumnBlocks.some((block) => /background:\s*linear-gradient/.test(block)),
  '.stats-panel > div has no gradient tile behind the number/label',
)
assert(
  !statColumnBlocks.some((block) => /backdrop-filter:\s*blur/.test(block)),
  '.stats-panel > div has no per-column backdrop-filter tile',
)

// ---------------------------------------------------------------------------
// Landing top bar vertical centering
// The .quest-nav glass bar centers its brand and auth groups via
// align-items: center, but that only works if the bar's own top/bottom padding
// is symmetric. A previous asymmetric shorthand (more bottom than top) pushed
// the row up against the top edge. The base rule (the block that owns padding)
// must keep align-items: center and use an even top/bottom vertical padding.
// ---------------------------------------------------------------------------
const questNavBlocks = css.match(/(?:^|[,}])\s*\.quest-nav\s*\{[^}]*\}/gm) || []
const questNavPaddingBlock = questNavBlocks.find((block) => /padding:/.test(block))
assert(questNavPaddingBlock !== undefined, '.quest-nav rule with padding exists')
assert(
  /align-items:\s*center/.test(questNavPaddingBlock || ''),
  '.quest-nav centers its groups (align-items: center)',
)
const questNavPadding = (questNavPaddingBlock || '').match(/padding:\s*([^;]+);/)
assert(questNavPadding !== null, '.quest-nav declares padding')
assert(
  questNavPadding !== null && questNavPadding[1].trim().split(/\s+/).length === 2,
  '.quest-nav uses a 2-value padding so top and bottom stay equal (no top-heavy bias)',
)

// ---------------------------------------------------------------------------
// Font system: Afacad Flux (body/UI) + Varela Round (nav/buttons), pixel kept
// The three families must all be loaded in one import, the two role variables
// must map to the right faces, and the pixel font must remain available so the
// intentional pixel headings/wordmark do not regress to a fallback.
// ---------------------------------------------------------------------------
assert(/@import url\([^)]*fonts\.googleapis[^)]*\)/.test(css), 'a Google Fonts import exists')
assert(css.includes('Afacad+Flux'), 'Afacad Flux is loaded')
assert(css.includes('Varela+Round'), 'Varela Round is loaded')
assert(css.includes('Press+Start+2P'), 'Press Start 2P (pixel font) is still loaded')
assert(css.includes("--font-body: 'Afacad Flux'"), '--font-body maps to Afacad Flux (default body/UI text)')
assert(css.includes("--font-ui: 'Varela Round'"), '--font-ui maps to Varela Round (nav/buttons)')
assert(has(':root', 'font-family: var(--font-body)'), 'the app default font is var(--font-body)')
assert(has('button', 'font-family: var(--font-ui)'), 'buttons use the Varela Round UI face')
assert(/\.app-nav,\s*\.quest-nav\s*\{[^}]*font-family:\s*var\(--font-ui\)/.test(css), 'nav surfaces use the Varela Round UI face')
// The pixel font variables must stay pointed at Press Start 2P.
assert(css.includes("--q-pixel: 'Press Start 2P'"), '--q-pixel still resolves to Press Start 2P (pixel locations preserved)')
assert(css.includes("--pixel-font: 'Press Start 2P'"), '--pixel-font still resolves to Press Start 2P (pixel locations preserved)')

// ---------------------------------------------------------------------------
// Mobile landing scroll: the draggable demo cards/tokens must not trap scroll
// Root cause of the stuck landing scroll on mobile: .studio-card and
// .studio-token set touch-action: none, so a vertical swipe starting on them
// was swallowed instead of panning the page. They must allow vertical panning
// (pan-y) so the landing page scrolls through the demo on touch.
// ---------------------------------------------------------------------------
// The .studio-card token appears twice (Studio Home cards + the draggable demo
// card), so scan every block: the draggable one must declare pan-y and none of
// them may set touch-action: none.
for (const sel of ['.studio-card', '.studio-token']) {
  const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const blocks = css.match(new RegExp(`(?:^|[,}])\\s*${escaped}\\s*\\{[^}]*\\}`, 'gm')) || []
  assert(blocks.length > 0, `${sel} rule exists`)
  assert(
    blocks.some((block) => /touch-action:\s*pan-y/.test(block)),
    `${sel} allows vertical page scroll on touch (touch-action: pan-y)`,
  )
  assert(
    !blocks.some((block) => /touch-action:\s*none/.test(block)),
    `${sel} does not block touch scrolling (no touch-action: none)`,
  )
}

if (failures) {
  console.error(`\n${failures} layout check(s) failed.`)
  process.exit(1)
}
console.log('\nAll layout sanity checks passed.')
