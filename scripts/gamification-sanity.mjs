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
  DAILY_FOCUS_COMPLETE_XP,
  MAX_DAILY_FOCUS,
  getTodayKey,
  getDailyFocus,
  isDailyFocusExpired,
  setDailyFocus,
  clearDailyFocus,
  getDailyFocusProgress,
  shouldAwardDailyFocus,
  awardDailyFocusCompletion,
  updateMomentumStreak,
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

// ── Daily Focus Quests ──
assert(DAILY_FOCUS_COMPLETE_XP === 25, 'daily focus bonus is 25 XP')
assert(getTodayKey(new Date(2026, 6, 9)) === '2026-07-09', 'getTodayKey formats local YYYY-MM-DD')

// set / get / cap / dedupe
const set1 = setDailyFocus({ rewarded_tasks: ['x'] }, ['a', 'b', 'a', 'c', 'd'], '2026-07-09')
assert(set1.rewarded_tasks[0] === 'x', 'setDailyFocus preserves other settings')
const df1 = getDailyFocus(set1)
assert(df1.date === '2026-07-09', 'getDailyFocus reads the date')
assert(df1.task_ids.length === MAX_DAILY_FOCUS, 'setDailyFocus caps at 3 tasks')
assert(df1.task_ids.join(',') === 'a,b,c', 'setDailyFocus dedupes and keeps order within cap')
assert(df1.completed === false && df1.claimed === false, 'new focus starts unclaimed')
assert(getDailyFocus({}) === null, 'getDailyFocus returns null with no focus')

// expiry
assert(isDailyFocusExpired(df1, '2026-07-10') === true, 'focus from yesterday is expired today')
assert(isDailyFocusExpired(df1, '2026-07-09') === false, 'today’s focus is not expired')
assert(isDailyFocusExpired(null, '2026-07-09') === true, 'missing focus is expired')

// progress ignores deleted tasks
const prog1 = getDailyFocusProgress(df1, { a: true, b: false })
assert(prog1.total === 2, 'progress total ignores deleted task c')
assert(prog1.completed === 1, 'progress counts completed present tasks')
assert(prog1.allComplete === false, 'not all complete when one is pending')
const prog2 = getDailyFocusProgress(df1, { a: true, b: true, c: true })
assert(prog2.allComplete === true, 'all complete when every present task is done')
const progEmpty = getDailyFocusProgress(df1, {})
assert(progEmpty.total === 0 && progEmpty.allComplete === false, 'all-deleted focus is never auto-complete')

// award gating
assert(shouldAwardDailyFocus(df1, { a: true, b: true, c: true }, '2026-07-09') === true, 'should award when all done today')
assert(shouldAwardDailyFocus(df1, { a: true, b: false, c: true }, '2026-07-09') === false, 'should not award while one pending')
assert(shouldAwardDailyFocus(df1, { a: true, b: true, c: true }, '2026-07-10') === false, 'should not award an expired focus')

// awarding marks claimed + writes one history row, idempotent per day
const awarded = awardDailyFocusCompletion(set1, '2026-07-09')
assert(awarded.daily_focus.claimed === true && awarded.daily_focus.completed === true, 'award marks claimed + completed')
assert(awarded.daily_focus_history.length === 1, 'award writes a history row')
assert(awarded.daily_focus_history[0].xp_awarded === 25, 'history records xp awarded')
assert(shouldAwardDailyFocus(getDailyFocus(awarded), { a: true, b: true, c: true }, '2026-07-09') === false, 'claimed focus never re-awards same day')
const awardedTwice = awardDailyFocusCompletion(awarded, '2026-07-09')
assert(awardedTwice.daily_focus_history.length === 1, 'award is idempotent per date (no duplicate history)')

// clearing
const cleared = clearDailyFocus(awarded)
assert(getDailyFocus(cleared) === null, 'clearDailyFocus removes the selection')
assert(cleared.daily_focus_history.length === 1, 'clearing keeps history intact')

// momentum streak
const s1 = updateMomentumStreak({}, '2026-07-09')
assert(s1.momentum_streak.current === 1 && s1.momentum_streak.best === 1, 'first completion starts a streak of 1')
const s2 = updateMomentumStreak(s1, '2026-07-10')
assert(s2.momentum_streak.current === 2 && s2.momentum_streak.best === 2, 'consecutive day extends the streak')
const s2again = updateMomentumStreak(s2, '2026-07-10')
assert(s2again.momentum_streak.current === 2, 'same-day streak update is a no-op')
const s3 = updateMomentumStreak(s2, '2026-07-13')
assert(s3.momentum_streak.current === 1, 'a gap resets current to 1')
assert(s3.momentum_streak.best === 2, 'best is retained across a reset')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll gamification sanity checks passed.')
