// Guards against the deploy-gap bug from 2026-08-20: GitHub Actions builds
// succeeded but the IONOS Deploy Now deployment step sat stuck "queued" for a
// month, so pushed code (including the Meta Pixel install) never reached
// infernotaskboard.com even though CI looked green. Run standalone with
// `node scripts/verify-pixel-live.mjs`, or wired as a Claude Code Stop hook.
//
// Fails OPEN (exit 0) on anything that isn't confirmed evidence of the bug -
// network hiccups, gh not installed/authed, etc. - so it never blocks
// unrelated work on a flaky connection. Fails CLOSED (exit 2) only when it
// can positively confirm the pixel is missing live or the IONOS deploy step
// is stuck/failed for the current commit.

const SITE_URL = 'https://infernotaskboard.com/'
const PIXEL_ID = '1619176119634089'
const FETCH_TIMEOUT_MS = 8000

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function checkLivePixel() {
  let res
  try {
    res = await fetchWithTimeout(`${SITE_URL}?verify=${Date.now()}`, { cache: 'no-store' })
  } catch (err) {
    return { status: 'unknown', detail: `Could not reach ${SITE_URL}: ${err.message}` }
  }
  if (!res.ok) {
    return { status: 'unknown', detail: `${SITE_URL} returned HTTP ${res.status}` }
  }
  const html = await res.text()
  const hasPixel = html.includes('fbq(') && html.includes(PIXEL_ID)
  return hasPixel
    ? { status: 'ok' }
    : { status: 'fail', detail: `Live HTML at ${SITE_URL} has no Meta Pixel snippet (looked for fbq(...${PIXEL_ID}...)).` }
}

async function checkIonosDeployStatus() {
  let proc
  try {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    proc = await promisify(execFile)(
      'gh',
      ['run', 'list', '--workflow=deploy-to-ionos.yaml', '--branch=main', '--limit=1', '--json=conclusion,status,createdAt'],
      { timeout: FETCH_TIMEOUT_MS, cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') },
    )
  } catch (err) {
    return { status: 'unknown', detail: `gh CLI unavailable or unauthenticated (${err.message}); skipped IONOS deploy check.` }
  }
  let runs
  try {
    runs = JSON.parse(proc.stdout)
  } catch {
    return { status: 'unknown', detail: 'Could not parse gh run list output.' }
  }
  const latest = runs[0]
  if (!latest) return { status: 'unknown', detail: 'No IONOS deploy runs found.' }
  if (latest.conclusion === 'action_required' || latest.conclusion === 'failure') {
    return {
      status: 'fail',
      detail: `Latest "Deploy Now: Deploy to IONOS" run on main is stuck/failed (conclusion: ${latest.conclusion}, created ${latest.createdAt}). Check the IONOS Deploy Now dashboard for a stuck queued deployment - cancel it and redeploy.`,
    }
  }
  return { status: 'ok' }
}

const [pixelResult, deployResult] = await Promise.all([checkLivePixel(), checkIonosDeployStatus()])

const failures = [pixelResult, deployResult].filter((r) => r.status === 'fail')
const unknowns = [pixelResult, deployResult].filter((r) => r.status === 'unknown')

if (failures.length > 0) {
  console.error('Meta Pixel deploy verification FAILED:')
  for (const f of failures) console.error(`  - ${f.detail}`)
  console.error('\nThis is the same class of bug as 2026-08-20: code/CI can look fine while production silently never updates.')
  process.exit(2)
}

if (unknowns.length > 0) {
  for (const u of unknowns) console.error(`(verify-pixel-live: skipped check - ${u.detail})`)
}

console.log('Meta Pixel deploy verification OK: infernotaskboard.com is serving the live pixel snippet.')
process.exit(0)
