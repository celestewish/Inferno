// Lightweight sanity checks for the gamification helpers. No test framework —
// run with `node scripts/gamification-sanity.mjs`. Exits non-zero on failure.
import {
  XP_PER_LEVEL,
  levelForXp,
  xpForLevel,
  levelProgress,
  makeBadge,
  normalizeBadges,
  hasBadge,
  isBugTask,
  evaluateEarnedBadgeIds,
  newlyEarnedBadges,
} from '../src/lib/gamification.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Levels
assert(levelForXp(0) === 1, 'level 1 at 0 XP')
assert(levelForXp(99) === 1, 'level 1 just under threshold')
assert(levelForXp(100) === 2, 'level 2 at exactly one threshold')
assert(levelForXp(450) === 5, 'level 5 at 450 XP')
assert(levelForXp(-20) === 1, 'negative XP clamps to level 1')
assert(xpForLevel(1) === 0, 'level 1 starts at 0 XP')
assert(xpForLevel(5) === 4 * XP_PER_LEVEL, 'level 5 starts at 400 XP')

const prog = levelProgress(130)
assert(prog.level === 2, 'progress: 130 XP is level 2')
assert(prog.intoLevel === 30, 'progress: 30 XP into level 2')
assert(prog.needed === 100, 'progress: 100 XP needed per level')
assert(prog.pct === 30, 'progress: 30% into level 2')
assert(prog.nextLevelXp === 200, 'progress: next level at 200 XP')

// Badges: make / normalize / dedupe
assert(makeBadge('first_spark').id === 'first_spark', 'makeBadge returns known badge')
assert(makeBadge('nonexistent') === null, 'makeBadge rejects unknown id')
const normalized = normalizeBadges([
  { id: 'first_spark', earned_at: '2026-01-01T00:00:00.000Z' },
  'quest_complete',
  { id: 'first_spark' }, // duplicate dropped
  { id: 'bogus' }, // unknown dropped
])
assert(normalized.length === 2, 'normalizeBadges dedupes and drops unknowns')
assert(normalized[0].earned_at === '2026-01-01T00:00:00.000Z', 'normalizeBadges preserves earned_at')
assert(hasBadge(normalized, 'quest_complete') === true, 'hasBadge finds a badge')
assert(hasBadge(normalized, 'flamekeeper') === false, 'hasBadge misses an unearned badge')

// Bug detection
assert(isBugTask({ discipline: 'Programming' }) === true, 'programming task is a bug-slayer task')
assert(isBugTask({ title: 'Fix crash on load' }) === true, 'fix/crash title counts')
assert(isBugTask({ title: 'Design menu', labels: ['UI'] }) === false, 'plain design task does not count')
assert(isBugTask({ title: 'Bugfix', labels: [] }) === false, 'bugfix (no word boundary) is not a false positive on partials')

// Badge evaluation
const completed10Bugs = Array.from({ length: 10 }, (_, i) => ({
  projectId: 'p1',
  discipline: 'Programming',
  title: `task ${i}`,
}))
const ids = evaluateEarnedBadgeIds({
  completedTasks: completed10Bugs,
  boardCount: 1,
  inviteCount: 1,
  level: 5,
  projectTaskTotals: { p1: 10 },
  tutorialDone: true,
})
assert(ids.includes('first_spark'), 'evaluate: first_spark with a board')
assert(ids.includes('quest_complete'), 'evaluate: quest_complete with a completed task')
assert(ids.includes('bug_slayer'), 'evaluate: bug_slayer at 10 bug tasks')
assert(ids.includes('scope_tamer'), 'evaluate: scope_tamer at 10 in one project')
assert(ids.includes('first_ship'), 'evaluate: first_ship when project fully done')
assert(ids.includes('team_captain'), 'evaluate: team_captain with an invite')
assert(ids.includes('jam_survivor'), 'evaluate: jam_survivor when tutorial done')
assert(ids.includes('flamekeeper'), 'evaluate: flamekeeper at level 5')

const none = evaluateEarnedBadgeIds({ completedTasks: [], boardCount: 0, level: 1 })
assert(none.length === 0, 'evaluate: nothing earned from an empty slate')

// Diffing only returns new badges (idempotent awarding)
const current = [makeBadge('first_spark')]
const fresh = newlyEarnedBadges(
  { completedTasks: [{ projectId: 'p1', title: 'a' }], boardCount: 1, level: 1 },
  current,
)
assert(fresh.length === 1 && fresh[0].id === 'quest_complete', 'newlyEarnedBadges skips already-earned, adds new')
const nothingNew = newlyEarnedBadges({ boardCount: 1 }, current)
assert(nothingNew.length === 0, 'newlyEarnedBadges returns empty when nothing new')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll gamification sanity checks passed.')
