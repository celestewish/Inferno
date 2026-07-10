// Release-candidate copy and polish guards. Ensures new user-facing copy stays
// free of em dashes and emoji, the data/access banners are standardized on the
// shared class, the Campfire channel error is classified correctly, the SEO
// meta tags are present, and the alpha feedback widget is wired up. No test
// framework - run with `node scripts/copy-sanity.mjs`. Exits non-zero on failure.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Emoji ranges covering the common pictographic and symbol blocks. Deliberately
// excludes plain punctuation and box-drawing arrows (→) which are allowed.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u
const EM_DASH = /—/

// These files carry only new or fully reviewed release-candidate copy and must
// stay free of em dashes and emoji.
const CLEAN_COPY_FILES = [
  'index.html',
  'src/components/FeedbackWidget.jsx',
  'src/components/DocsView.jsx',
  'src/components/CodeForgeView.jsx',
  'src/components/NotificationsView.jsx',
  'src/components/WarRoomView.jsx',
  'src/components/ReportsView.jsx',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
]
for (const rel of CLEAN_COPY_FILES) {
  const text = read(rel)
  assert(!EM_DASH.test(text), `${rel} has no em dash`)
  assert(!EMOJI.test(text), `${rel} has no emoji`)
}

// The onboarding guide copy lives in App.jsx (which legitimately uses emoji
// elsewhere), so check the onboarding block in isolation for em dashes.
const app = read('src/App.jsx')
const onboardingStart = app.indexOf('function OnboardingGuide(')
const onboardingEnd = app.indexOf('function AuthModal(')
const onboarding = app.slice(onboardingStart, onboardingEnd)
assert(onboardingStart !== -1 && onboardingEnd !== -1, 'OnboardingGuide block is locatable')
assert(!EM_DASH.test(onboarding), 'onboarding guide copy has no em dash')

// Standardized data/access banners: each feature view uses the shared class with
// the correct setup/access modifier instead of a bespoke per-view class.
for (const rel of [
  'src/components/DocsView.jsx',
  'src/components/CodeForgeView.jsx',
  'src/components/NotificationsView.jsx',
  'src/components/WarRoomView.jsx',
]) {
  const text = read(rel)
  assert(text.includes('app-data-note is-setup'), `${rel} uses the shared setup banner class`)
  assert(text.includes('app-data-note is-access'), `${rel} uses the shared access banner class`)
}
// The old bespoke banner classes are gone from the components.
for (const [rel, cls] of [
  ['src/components/DocsView.jsx', 'docs-migration-note'],
  ['src/components/CodeForgeView.jsx', 'forge-migration-note'],
  ['src/components/NotificationsView.jsx', 'notif-note'],
]) {
  assert(!read(rel).includes(`className="${cls}"`), `${rel} no longer uses the bespoke ${cls} class`)
}
// War Room keeps its voice-alert note class (shared with non-banner alerts).
assert(read('src/components/WarRoomView.jsx').includes('warroom-note warroom-note-warn'), 'War Room voice alert note class is preserved')

// Shared banner CSS exists with both modifiers.
const css = read('src/App.css')
assert(css.includes('.app-data-note'), '.app-data-note base class exists in CSS')
assert(css.includes('.app-data-note.is-setup'), '.app-data-note.is-setup modifier exists')
assert(css.includes('.app-data-note.is-access'), '.app-data-note.is-access modifier exists')

// Campfire channel creation error must treat a missing table (not just a missing
// column) as the migration case, matching the other feature views.
assert(
  /Channel not added[\s\S]*?isMissingTableError\(error\) \|\| isMissingColumnError\(error\)/.test(app),
  'Campfire channel error classifies missing table OR column as the migration case',
)

// App-level loading states use the reusable spinner class, not inline styles.
assert(css.includes('.app-loading'), '.app-loading class exists in CSS')
assert(css.includes('app-loading-spinner'), '.app-loading spinner class exists')
assert(app.includes('className="app-loading"'), 'App.jsx uses the shared loading class')
assert(!/placeItems: 'center', minHeight: '100vh', color: '#aeb8dd'/.test(app), 'inline loading styles were removed')

// Reports empty state.
assert(read('src/components/ReportsView.jsx').includes('report-empty'), 'Reports view has an empty state')

// SEO / social meta in index.html.
const html = read('index.html')
for (const needle of [
  'name="description"',
  'property="og:title"',
  'property="og:image"',
  'property="og:url"',
  'name="twitter:card"',
  'name="twitter:image"',
  'rel="canonical"',
  'name="theme-color"',
]) {
  assert(html.includes(needle), `index.html declares ${needle}`)
}

// Feedback widget: mounted in App.jsx and points at the bug template + email.
assert(app.includes('<FeedbackWidget'), 'FeedbackWidget is mounted in the authenticated app')
const widget = read('src/components/FeedbackWidget.jsx')
assert(widget.includes('issues/new?template=bug_report.yml'), 'FeedbackWidget links to the bug report template')
assert(widget.includes('mailto:'), 'FeedbackWidget offers an email fallback')

// Bug report template has the required fields.
const tmpl = read('.github/ISSUE_TEMPLATE/bug_report.yml')
for (const id of ['id: page', 'id: environment', 'id: steps', 'id: expected', 'id: actual', 'id: screenshot', 'id: severity']) {
  assert(tmpl.includes(id), `bug report template has field ${id}`)
}

if (failures) {
  console.error(`\n${failures} copy/polish check(s) failed.`)
  process.exit(1)
}
console.log('\nAll copy/polish sanity checks passed.')
