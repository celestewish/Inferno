// Static guard for the signed-out landing (Game Jam Studio Simulator)
// performance characteristics. Dragging used to call setState on every pointer
// move, which re-rendered the whole landing tree, and the deadline timer lived
// in the top-level component so its 1s tick reconciled everything too. This
// script asserts the containment that keeps those paths cheap, by parsing
// src/components/QuestLanding.jsx. No framework - run with
// `node scripts/landing-perf-sanity.mjs`. Exits non-zero on failure.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'src', 'components', 'QuestLanding.jsx'), 'utf8')

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Isolate the drag hook body so pointer-move assertions cannot be satisfied by
// unrelated code elsewhere in the file.
const hookStart = src.indexOf('function usePointerDrag')
const hookEnd = src.indexOf('\nfunction ', hookStart + 1)
const hook = hookStart === -1 ? '' : src.slice(hookStart, hookEnd === -1 ? undefined : hookEnd)

assert(hook.length > 0, 'usePointerDrag hook is present')

// The move handler must not push pointer coordinates through React state on
// every event. It writes them to a ref and paints via requestAnimationFrame.
assert(src.includes('requestAnimationFrame'), 'drag movement is scheduled with requestAnimationFrame')
assert(src.includes('cancelAnimationFrame'), 'the animation frame is cancelled on drag end and unmount')
assert(hook.includes('stateRef.current'), 'live pointer coordinates live in a ref, not in state')
assert(
  hook.includes('el.style.transform') && hook.includes('translate3d('),
  'the ghost moves with a transform written straight to the element',
)

// The move handler crosses the threshold into state at most once (moved flag),
// never once per pixel. Guard against a regression that stores x/y in state.
const moveBody = (() => {
  const i = hook.indexOf('const move = useCallback')
  if (i === -1) return ''
  const j = hook.indexOf('const end = useCallback', i)
  return hook.slice(i, j === -1 ? undefined : j)
})()
assert(moveBody.length > 0, 'move handler is present')
assert(
  !/setDragMeta\(\{[^}]*x:/.test(moveBody) && !moveBody.includes('x: event.clientX,\n'),
  'move does not store pointer coordinates in React state',
)
assert(
  (moveBody.match(/setDragMeta/g) || []).length <= 1,
  'move updates drag state at most once (only when the threshold is crossed)',
)

// The deadline countdown is isolated in its own component so its interval does
// not re-render the whole landing.
assert(src.includes('StudioCountdown'), 'the deadline clock is isolated in a StudioCountdown component')
assert(
  /const StudioCountdown = memo\(/.test(src),
  'StudioCountdown is memoized so parent renders do not re-render it',
)
const countdownStart = src.indexOf('const StudioCountdown = memo(')
const countdownBody = countdownStart === -1 ? '' : src.slice(countdownStart, countdownStart + 500)
assert(countdownBody.includes('setInterval'), 'StudioCountdown owns its own interval')

// The top-level component must no longer own the timer (that was the whole
// point of extracting it).
const componentStart = src.indexOf('export default function QuestLanding')
const component = componentStart === -1 ? '' : src.slice(componentStart)
assert(!component.includes('setInterval'), 'QuestLanding no longer runs the timer at the top level')
assert(!component.includes('secondsLeft'), 'QuestLanding no longer holds countdown state')

// Presentational meter bars are memoized so unrelated re-renders skip them.
assert(/const MeterBar = memo\(/.test(src), 'MeterBar is memoized')

// Pointer + touch support and the tap fallback must be preserved.
assert(src.includes('setPointerCapture'), 'pointer capture keeps mouse and touch drags consistent')
assert(src.includes('onTap?.('), 'tap fallback is preserved for non-drag pointer interactions')

if (failures) {
  console.error(`\n${failures} landing-perf check(s) failed.`)
  process.exit(1)
}
console.log('\nAll landing-perf sanity checks passed.')
