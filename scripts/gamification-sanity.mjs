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
  BOSS_HP_PER_TASK,
  DEFAULT_BOSS_REWARD_XP,
  createBossFight,
  getBossMaxHp,
  getBossProgress,
  isBossDefeated,
  shouldAwardBossReward,
  markBossClaimed,
  getBossRewardXp,
  BOSS_MIN_TASKS,
  BOSS_MAX_TASKS,
  BOSS_XP_MIN,
  BOSS_XP_MAX,
  taskXpValue,
  computeBossRewardXp,
  pickBossTasks,
  generateBossFight,
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

// ── Milestone Boss Fights ──
assert(BOSS_HP_PER_TASK === 25, 'boss HP per task is 25')
assert(DEFAULT_BOSS_REWARD_XP === 50, 'default boss reward is 50 XP')

// create: shape, defaults, dedupe
const boss = createBossFight(
  { id: 'b1', name: '  Vertical Slice  ', phase: 'Milestone 1', projectId: 'p1', taskIds: ['t1', 't2', 't1', 't3'] },
  '2026-07-09T00:00:00.000Z',
)
assert(boss.id === 'b1', 'createBossFight keeps a provided id')
assert(boss.name === 'Vertical Slice', 'createBossFight trims the name')
assert(boss.project_id === 'p1', 'createBossFight records the project id')
assert(boss.task_ids.join(',') === 't1,t2,t3', 'createBossFight dedupes linked task ids')
assert(boss.reward_xp === DEFAULT_BOSS_REWARD_XP, 'createBossFight defaults reward to 50 XP')
assert(boss.claimed === false && boss.defeated_at === null, 'new boss starts unclaimed')
const customXpBoss = createBossFight({ name: 'X', taskIds: ['t1'], rewardXp: 120 })
assert(customXpBoss.reward_xp === 120, 'createBossFight honors a custom reward')
assert(getBossRewardXp({ reward_xp: 0 }) === DEFAULT_BOSS_REWARD_XP, 'getBossRewardXp falls back for non-positive values')
assert(typeof createBossFight({ name: 'Y', taskIds: ['t1'] }).id === 'string', 'createBossFight generates an id when none is given')

// HP + progress
assert(getBossMaxHp(boss) === 75, 'maxHp is task count times 25')
const p0 = getBossProgress(boss, { t1: false, t2: false, t3: false })
assert(p0.currentHp === 75 && p0.pct === 100 && p0.defeated === false, 'full HP when nothing is done')
const p1 = getBossProgress(boss, { t1: true, t2: false, t3: false })
assert(p1.currentHp === 50 && p1.completed === 1 && p1.remaining === 2, 'one weak point struck removes 25 HP')
const pAll = getBossProgress(boss, { t1: true, t2: true, t3: true })
assert(pAll.currentHp === 0 && pAll.pct === 0 && pAll.defeated === true, 'boss defeated at 0 HP')
const pDeleted = getBossProgress(boss, { t1: true, t2: true })
assert(pDeleted.currentHp === 25 && pDeleted.defeated === false, 'deleted linked task keeps the boss alive, no crash')
assert(getBossProgress({ task_ids: [] }, {}).defeated === false, 'a boss with no tasks is never defeated')

// award gating + claim
assert(isBossDefeated(boss, { t1: true, t2: true, t3: true }) === true, 'isBossDefeated true when all done')
assert(shouldAwardBossReward(boss, { t1: true, t2: true, t3: true }) === true, 'should award a fresh defeated boss')
assert(shouldAwardBossReward(boss, { t1: true, t2: false, t3: true }) === false, 'should not award while a weak point stands')
const claimed = markBossClaimed(boss, '2026-07-09T12:00:00.000Z')
assert(claimed.claimed === true && claimed.defeated_at === '2026-07-09T12:00:00.000Z', 'markBossClaimed stamps claimed + defeated_at')
assert(shouldAwardBossReward(claimed, { t1: true, t2: true, t3: true }) === false, 'claimed boss never re-awards (no farming)')
const reclaimed = markBossClaimed(claimed, '2026-07-10T00:00:00.000Z')
assert(reclaimed.defeated_at === '2026-07-09T12:00:00.000Z', 'markBossClaimed keeps the original defeated_at')
// reopening a task after a claim must not revoke the reward
assert(shouldAwardBossReward(claimed, { t1: true, t2: false, t3: true }) === false, 'reopening a task after defeat does not re-trigger an award')

// ── Boss generation (deterministic via injected rng) ──
const rngLo = () => 0            // always the band/count minimum
const rngHi = () => 0.9999999    // always the band/count maximum

assert(BOSS_MIN_TASKS === 2 && BOSS_MAX_TASKS === 4, 'boss rolls 2 to 4 weak points')
assert(BOSS_XP_MIN === 25 && BOSS_XP_MAX === 120, 'boss reward is clamped to 25..120')

// per-task XP bands
assert(taskXpValue({ priority: 'Low' }, rngLo) === 8, 'low task floors at 8 XP')
assert(taskXpValue({ priority: 'low' }, rngHi) === 12, 'low task caps at 12 XP')
assert(taskXpValue({ priority: 'high' }, rngLo) === 18, 'high task floors at 18 XP')
assert(taskXpValue({ priority: 'high' }, rngHi) === 28, 'high task caps at 28 XP')
assert(taskXpValue({ priority: 'critical' }, rngLo) === 25, 'critical task floors at 25 XP')
assert(taskXpValue({ priority: 'urgent' }, rngHi) === 40, 'urgent task caps at 40 XP')
assert(taskXpValue({ priority: 'mystery' }, rngLo) === 12, 'unknown priority uses the medium band')
assert(taskXpValue({ priority: 'low', estimate: '6 pt' }, rngLo) === 11, 'estimate adds a small bonus')
assert(taskXpValue({ priority: 'low', estimate: '40' }, rngLo) === 14, 'estimate bonus is capped at 6')
assert(taskXpValue({ priority: 'low', estimate: '2 pt' }, rngLo) === 8, 'short estimates add no bonus')

// reward totals + clamping
assert(computeBossRewardXp([{ priority: 'low' }], rngLo) === BOSS_XP_MIN, 'tiny reward clamps up to 25')
assert(
  computeBossRewardXp(
    [{ priority: 'critical' }, { priority: 'critical' }, { priority: 'critical' }, { priority: 'critical' }],
    rngHi,
  ) === BOSS_XP_MAX,
  'huge reward clamps down to 120',
)
assert(
  computeBossRewardXp([{ priority: 'medium' }, { priority: 'medium' }, { priority: 'medium' }], rngLo) === 41,
  'three medium tasks = 36 + 5 encounter bonus',
)
assert(computeBossRewardXp([], rngLo) === BOSS_XP_MIN, 'empty task list still clamps to 25')

// weak-point selection prefers incomplete, clamps to availability
const pool5 = [
  { id: 't1', priority: 'medium' },
  { id: 't2', priority: 'medium' },
  { id: 't3', priority: 'medium' },
  { id: 't4', priority: 'medium', completed: true },
  { id: 't5', priority: 'medium', completed: true },
]
const picked = pickBossTasks(pool5, rngLo)
assert(picked.length === 2, 'rng floor picks the minimum of 2 weak points')
assert(picked.every((task) => !task.completed), 'picked weak points are all incomplete when possible')
assert(pickBossTasks(pool5, rngHi).length === 3, 'rng ceiling clamps to the 3 incomplete tasks')
assert(pickBossTasks([{ id: 'c1', completed: true }, { id: 'c2', completed: true }], rngLo).length === 2, 'falls back to completed tasks when none are open')
assert(pickBossTasks([{ id: 'only', completed: false }], rngLo).length === 1, 'a single eligible task yields one weak point')
assert(pickBossTasks([], rngLo).length === 0, 'no tasks yields no weak points')

// full generation stores stable weak points + reward
const genTasks = [
  { id: 'g1', priority: 'medium' },
  { id: 'g2', priority: 'medium' },
  { id: 'g3', priority: 'medium' },
]
const generated = generateBossFight({ name: '  Ghoul  ', phase: 'M2', projectId: 'p9', tasks: genTasks }, rngLo, '2026-07-09T00:00:00.000Z')
assert(generated.name === 'Ghoul' && generated.phase === 'M2' && generated.project_id === 'p9', 'generateBossFight carries name/phase/project')
assert(generated.task_ids.length === 2, 'generateBossFight rolls weak points (2 at rng floor)')
assert(generated.reward_xp === BOSS_XP_MIN, 'generateBossFight stores the computed reward (24 clamps to 25)')
assert(generated.claimed === false && generated.defeated_at === null, 'generated boss starts unclaimed')
assert(generateBossFight({ name: 'Empty', tasks: [] }, rngLo) === null, 'generateBossFight returns null with no eligible tasks')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll gamification sanity checks passed.')
