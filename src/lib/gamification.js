// Phase One gamification: XP, levels, and achievement badges.
//
// This module is intentionally pure (no React, no Supabase) so the rules can be
// unit tested with `node scripts/gamification-sanity.mjs` and reused anywhere.
// The awarding side effects (state updates, persistence, toasts) live in App.

// XP awarded per meaningful action. Kept small and deliberate so progress feels
// earned rather than farmed.
export const XP_REWARDS = {
  TASK_COMPLETE: 10,
  TASK_COMPLETE_HIGH: 15,
  FIRST_BOARD: 25,
  FIRST_INVITE: 15,
  JAM_TUTORIAL: 25,
}

// Fixed, flat threshold: every level costs the same amount of XP. Simple to
// reason about and easy to show as "x / 100 XP to next level".
export const XP_PER_LEVEL = 100

// Level for a given total XP. Level 1 starts at 0 XP.
export function levelForXp(xp) {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0
  return Math.floor(safe / XP_PER_LEVEL) + 1
}

// Cumulative XP required to have reached the start of a given level.
export function xpForLevel(level) {
  const safe = Number.isFinite(level) && level > 1 ? Math.floor(level) : 1
  return (safe - 1) * XP_PER_LEVEL
}

// Progress breakdown for the UI: current level, XP into the current level, XP
// the level needs, percentage, and the absolute XP at which the next level hits.
export function levelProgress(xp) {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0
  const level = levelForXp(safe)
  const floor = xpForLevel(level)
  const intoLevel = safe - floor
  const needed = XP_PER_LEVEL
  const pct = Math.max(0, Math.min(100, Math.round((intoLevel / needed) * 100)))
  return { level, xp: safe, intoLevel, needed, pct, nextLevelXp: floor + needed }
}

// Badge catalog. Each entry is a definition; an *earned* badge is a definition
// plus an `earned_at` ISO timestamp (see makeBadge).
export const BADGES = [
  {
    id: 'first_spark',
    name: 'First Spark',
    description: 'Create your first board.',
    icon: '✨',
    rarity: 'common',
  },
  {
    id: 'quest_complete',
    name: 'Quest Complete',
    description: 'Complete your first task.',
    icon: '⚔',
    rarity: 'common',
  },
  {
    id: 'bug_slayer',
    name: 'Bug Slayer',
    description: 'Complete 10 programming or bug tasks.',
    icon: '\u{1F41B}',
    rarity: 'rare',
  },
  {
    id: 'scope_tamer',
    name: 'Scope Tamer',
    description: 'Complete 10 tasks in a single project.',
    icon: '\u{1F5FA}',
    rarity: 'rare',
  },
  {
    id: 'team_captain',
    name: 'Team Captain',
    description: 'Invite your first teammate.',
    icon: '\u{1F6E1}',
    rarity: 'common',
  },
  {
    id: 'jam_survivor',
    name: 'Jam Survivor',
    description: 'Complete the Game Jam Quest tutorial.',
    icon: '\u{1F525}',
    rarity: 'uncommon',
  },
  {
    id: 'first_ship',
    name: 'First Ship',
    description: 'Finish every task in a project.',
    icon: '\u{1F680}',
    rarity: 'uncommon',
  },
  {
    id: 'flamekeeper',
    name: 'Flamekeeper',
    description: 'Reach level 5.',
    icon: '\u{1F3C6}',
    rarity: 'epic',
  },
]

const BADGE_BY_ID = Object.fromEntries(BADGES.map((badge) => [badge.id, badge]))

export function getBadgeDef(id) {
  return BADGE_BY_ID[id] ?? null
}

// Build an earned-badge record from a badge id. Returns null for unknown ids so
// callers never persist garbage.
export function makeBadge(id, earnedAt = new Date().toISOString()) {
  const def = BADGE_BY_ID[id]
  if (!def) return null
  return { ...def, earned_at: earnedAt }
}

// Coerce an arbitrary stored value (jsonb) into a clean array of earned-badge
// records, dropping unknown ids and duplicates. Keeps the first occurrence.
export function normalizeBadges(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const entry of value) {
    const id = entry && typeof entry === 'object' ? entry.id : entry
    if (typeof id !== 'string' || !BADGE_BY_ID[id] || seen.has(id)) continue
    seen.add(id)
    const earnedAt =
      entry && typeof entry === 'object' && typeof entry.earned_at === 'string'
        ? entry.earned_at
        : new Date().toISOString()
    out.push(makeBadge(id, earnedAt))
  }
  return out
}

export function hasBadge(badges, id) {
  return normalizeBadges(badges).some((badge) => badge.id === id)
}

// A task counts toward Bug Slayer if it is programming work or clearly a
// bug/fix/crash task by title or label.
export function isBugTask(task) {
  if (!task) return false
  const discipline = String(task.discipline ?? '').toLowerCase()
  if (discipline.includes('program') || discipline.includes('code')) return true
  const haystack = [task.title, ...(Array.isArray(task.labels) ? task.labels : [])]
    .join(' ')
    .toLowerCase()
  return /\b(bug|fix|crash|hotfix|patch|defect)\b/.test(haystack)
}

// Given a snapshot of the player's state, return the ids of every badge that is
// currently satisfied. Idempotent by nature: callers diff against already-earned
// ids before awarding, and re-evaluating never removes a badge.
//
// stats: {
//   completedTasks: Task[]   // tasks the player has completed (completed === true)
//   boardCount: number       // boards the player owns/belongs to
//   inviteCount: number      // teammates invited
//   level: number            // current level
//   projectTaskTotals: Record<projectId, number>  // total tasks per project
//   tutorialDone: boolean    // Game Jam Quest tutorial completed
// }
export function evaluateEarnedBadgeIds(stats = {}) {
  const completed = Array.isArray(stats.completedTasks) ? stats.completedTasks : []
  const earned = []

  if ((stats.boardCount ?? 0) >= 1) earned.push('first_spark')
  if (completed.length >= 1) earned.push('quest_complete')
  if (completed.filter(isBugTask).length >= 10) earned.push('bug_slayer')

  const perProjectCompleted = {}
  for (const task of completed) {
    const key = task.projectId ?? task.project_id ?? 'unknown'
    perProjectCompleted[key] = (perProjectCompleted[key] ?? 0) + 1
  }
  if (Object.values(perProjectCompleted).some((count) => count >= 10)) earned.push('scope_tamer')

  // First Ship: a project where every task is done and there is at least one.
  const totals = stats.projectTaskTotals ?? {}
  const shipped = Object.entries(totals).some(([projectId, total]) => {
    return total >= 1 && (perProjectCompleted[projectId] ?? 0) >= total
  })
  if (shipped) earned.push('first_ship')

  if ((stats.inviteCount ?? 0) >= 1) earned.push('team_captain')
  if (stats.tutorialDone) earned.push('jam_survivor')
  if ((stats.level ?? 1) >= 5) earned.push('flamekeeper')

  return earned
}

// Diff freshly-satisfied badges against those already earned. Returns the new
// earned-badge records to persist (empty array if nothing new).
export function newlyEarnedBadges(stats, currentBadges) {
  const already = new Set(normalizeBadges(currentBadges).map((badge) => badge.id))
  const satisfied = evaluateEarnedBadgeIds(stats)
  const now = new Date().toISOString()
  return satisfied.filter((id) => !already.has(id)).map((id) => makeBadge(id, now))
}

// ── Daily Focus Quests ──
// A healthy, non-punishing daily loop: pick up to 3 focus tasks for the local
// day, and earn a one-time bonus when they are all done. State lives entirely
// inside `gamification_settings` (no new columns), so these helpers are pure
// transforms over that settings object.

export const DAILY_FOCUS_COMPLETE_XP = 25
export const MAX_DAILY_FOCUS = 3

// Local-day key as YYYY-MM-DD. Uses the local calendar date (not UTC) so the
// quest resets at the player's midnight, matching how the date is displayed.
export function getTodayKey(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// The calendar day before a YYYY-MM-DD key. Used for streak continuity.
function previousDayKey(todayKey) {
  const [y, m, d] = String(todayKey).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return getTodayKey(date)
}

// Read the stored daily-focus record (or null). Coerces task_ids to a clean,
// capped, de-duplicated array of strings so callers never handle garbage.
export function getDailyFocus(settings) {
  const raw = settings && typeof settings === 'object' ? settings.daily_focus : null
  if (!raw || typeof raw !== 'object' || typeof raw.date !== 'string') return null
  const ids = Array.isArray(raw.task_ids) ? raw.task_ids : []
  const cleaned = []
  const seen = new Set()
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id)) continue
    seen.add(id)
    cleaned.push(id)
    if (cleaned.length >= MAX_DAILY_FOCUS) break
  }
  return {
    date: raw.date,
    task_ids: cleaned,
    completed: Boolean(raw.completed),
    claimed: Boolean(raw.claimed),
  }
}

// True when there is no focus for today (missing or from an earlier day).
export function isDailyFocusExpired(dailyFocus, todayKey = getTodayKey()) {
  return !dailyFocus || dailyFocus.date !== todayKey
}

// Store a fresh focus for `todayKey`, replacing any prior day. Resets the
// completed/claimed flags so a new day always starts unclaimed.
export function setDailyFocus(settings, taskIds, todayKey = getTodayKey()) {
  const base = settings && typeof settings === 'object' ? settings : {}
  const ids = Array.isArray(taskIds) ? taskIds : []
  const cleaned = []
  const seen = new Set()
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id)) continue
    seen.add(id)
    cleaned.push(id)
    if (cleaned.length >= MAX_DAILY_FOCUS) break
  }
  return {
    ...base,
    daily_focus: { date: todayKey, task_ids: cleaned, completed: false, claimed: false },
  }
}

// Remove today's focus selection.
export function clearDailyFocus(settings) {
  const base = settings && typeof settings === 'object' ? settings : {}
  return { ...base, daily_focus: null }
}

// Progress over the *currently existing* selected tasks. Deleted tasks are
// ignored gracefully (dropped from the total) so a removed card never leaves an
// unreachable "1 / 3". `completedById` maps task id -> boolean completed.
export function getDailyFocusProgress(dailyFocus, completedById = {}) {
  const ids = dailyFocus && Array.isArray(dailyFocus.task_ids) ? dailyFocus.task_ids : []
  const present = ids.filter((id) => Object.prototype.hasOwnProperty.call(completedById, id))
  const completed = present.filter((id) => completedById[id]).length
  const total = present.length
  return { total, completed, allComplete: total > 0 && completed === total }
}

// Whether the bonus should fire now: focus is for today, not yet claimed, and
// every existing selected task is complete.
export function shouldAwardDailyFocus(dailyFocus, completedById = {}, todayKey = getTodayKey()) {
  if (isDailyFocusExpired(dailyFocus, todayKey)) return false
  if (dailyFocus.claimed) return false
  return getDailyFocusProgress(dailyFocus, completedById).allComplete
}

// Mark today's focus complete + claimed and append a history entry. Idempotent
// per date: re-running replaces (does not duplicate) today's history row.
export function awardDailyFocusCompletion(settings, todayKey = getTodayKey(), xp = DAILY_FOCUS_COMPLETE_XP) {
  const base = settings && typeof settings === 'object' ? settings : {}
  const df = getDailyFocus(base)
  if (!df) return base
  const updatedFocus = { ...df, completed: true, claimed: true }
  const history = Array.isArray(base.daily_focus_history) ? base.daily_focus_history : []
  const withoutToday = history.filter((entry) => entry && entry.date !== todayKey)
  const entry = {
    date: todayKey,
    task_ids: df.task_ids,
    completed: true,
    claimed: true,
    xp_awarded: xp,
  }
  return { ...base, daily_focus: updatedFocus, daily_focus_history: [...withoutToday, entry] }
}

// Advance the momentum streak by one for `todayKey`. Consecutive days increment
// current; a gap resets it to 1. Recording the same day twice is a no-op, so
// this is safe to call alongside the idempotent award.
export function updateMomentumStreak(settings, todayKey = getTodayKey()) {
  const base = settings && typeof settings === 'object' ? settings : {}
  const streak =
    base.momentum_streak && typeof base.momentum_streak === 'object'
      ? base.momentum_streak
      : { current: 0, best: 0, last_completed_date: null }
  if (streak.last_completed_date === todayKey) return base
  const current = streak.last_completed_date === previousDayKey(todayKey) ? (streak.current ?? 0) + 1 : 1
  const best = Math.max(streak.best ?? 0, current)
  return { ...base, momentum_streak: { current, best, last_completed_date: todayKey } }
}

// ── Milestone Boss Fights ──
// A boss turns a project milestone into an encounter: link tasks as "weak
// points", and the boss loses HP as those tasks are completed. When every
// linked task is done the boss is defeated and awards a one-time XP bonus.
// Bosses live on the project record (projects.boss_fights jsonb), so these are
// pure transforms over a single boss object plus a task id -> completed map.

// Each linked task is worth this much boss HP. maxHp = task_ids.length * 25.
export const BOSS_HP_PER_TASK = 25
// Fallback reward if a boss somehow has no generated reward stored.
export const DEFAULT_BOSS_REWARD_XP = 50

// Best-effort unique id that works in the browser and in the Node test runner.
function makeBossId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `boss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function cleanTaskIds(taskIds) {
  const out = []
  const seen = new Set()
  for (const id of Array.isArray(taskIds) ? taskIds : []) {
    if (typeof id !== 'string' || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

// Normalize a reward value to a positive integer, falling back to the default.
export function getBossRewardXp(boss) {
  const raw = boss && typeof boss === 'object' ? boss.reward_xp : boss
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_BOSS_REWARD_XP
}

// Build a fresh boss record. Returns a plain object ready to store on the
// project. Task ids are de-duplicated; a caller must supply at least one (the
// UI enforces this) or the boss can never be defeated.
export function createBossFight(input = {}, createdAt = new Date().toISOString()) {
  return {
    id: typeof input.id === 'string' && input.id ? input.id : makeBossId(),
    name: String(input.name ?? '').trim(),
    phase: String(input.phase ?? '').trim(),
    project_id: input.projectId ?? input.project_id ?? null,
    task_ids: cleanTaskIds(input.taskIds ?? input.task_ids),
    reward_xp: getBossRewardXp({ reward_xp: input.rewardXp ?? input.reward_xp }),
    created_at: createdAt,
    defeated_at: null,
    claimed: false,
  }
}

// Total HP for a boss: one chunk per linked task.
export function getBossMaxHp(boss) {
  const ids = boss && Array.isArray(boss.task_ids) ? boss.task_ids : []
  return ids.length * BOSS_HP_PER_TASK
}

// HP/progress snapshot for the UI. `completedById` maps task id -> completed.
// Deleted tasks are simply absent from the map, so they contribute no damage
// (the boss stays alive) but never crash the panel. defeated is true only when
// there is at least one linked task and every one is complete (HP hits 0).
export function getBossProgress(boss, completedById = {}) {
  const ids = boss && Array.isArray(boss.task_ids) ? boss.task_ids : []
  const total = ids.length
  const completed = ids.filter((id) => completedById[id]).length
  const maxHp = total * BOSS_HP_PER_TASK
  const currentHp = Math.max(0, maxHp - completed * BOSS_HP_PER_TASK)
  const pct = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0
  return { total, completed, remaining: total - completed, maxHp, currentHp, pct, defeated: total > 0 && currentHp === 0 }
}

// True when the boss's HP has reached zero (all linked tasks complete).
export function isBossDefeated(boss, completedById = {}) {
  return getBossProgress(boss, completedById).defeated
}

// Whether the one-time reward should fire now: the boss is defeated and has not
// already been claimed. Editing/reopening tasks after a claim never re-awards.
export function shouldAwardBossReward(boss, completedById = {}) {
  if (!boss || boss.claimed) return false
  return isBossDefeated(boss, completedById)
}

// Stamp a boss as claimed + defeated. Idempotent: an already-claimed boss keeps
// its original defeated_at so re-running never changes the record's history.
export function markBossClaimed(boss, defeatedAt = new Date().toISOString()) {
  if (!boss || typeof boss !== 'object') return boss
  return { ...boss, claimed: true, defeated_at: boss.defeated_at ?? defeatedAt }
}

// ── Boss generation (weak points + reward) ──
// Weak points and reward XP are rolled by Inferno rather than chosen by the
// player, so a boss can't be stacked with trivial tasks for a huge payout. All
// randomness flows through an injectable `rng` (defaults to Math.random) so the
// generation is deterministic under test.

// How many weak points a boss rolls, clamped to the eligible task count.
export const BOSS_MIN_TASKS = 2
export const BOSS_MAX_TASKS = 4
// Total reward is clamped to this range so a boss is always worth it but never
// farmable into the stratosphere.
export const BOSS_XP_MIN = 25
export const BOSS_XP_MAX = 120

// XP band [min, max] per task, keyed by priority. Unknown priorities fall back
// to the medium band.
const TASK_XP_BANDS = {
  low: [8, 12],
  medium: [12, 18],
  normal: [12, 18],
  high: [18, 28],
  critical: [25, 40],
  urgent: [25, 40],
}

function normalizeRng(rng) {
  return typeof rng === 'function' ? rng : Math.random
}

// Integer in [min, max] inclusive, driven by `rng` (a 0..1 source).
function randInt(rng, min, max) {
  if (max <= min) return min
  const raw = normalizeRng(rng)()
  const safe = raw >= 1 ? 0.9999999 : raw < 0 ? 0 : raw
  return min + Math.floor(safe * (max - min + 1))
}

function shuffle(list, rng) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, 0, i)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// XP a single task contributes, based on its priority band plus a small bonus
// for a longer parseable estimate (e.g. "3 pt"). Randomized within the band.
export function taskXpValue(task, rng = Math.random) {
  const priority = String(task?.priority ?? '').toLowerCase().trim()
  const band = TASK_XP_BANDS[priority] ?? TASK_XP_BANDS.medium
  let value = randInt(rng, band[0], band[1])
  const estimate = parseInt(String(task?.estimate ?? ''), 10)
  if (Number.isFinite(estimate) && estimate >= 3) {
    value += Math.min(6, Math.floor(estimate / 2))
  }
  return value
}

// Total boss reward from its linked tasks: the sum of per-task values plus a
// small bonus for larger encounters, clamped to [BOSS_XP_MIN, BOSS_XP_MAX].
export function computeBossRewardXp(tasks, rng = Math.random) {
  const list = Array.isArray(tasks) ? tasks.filter(Boolean) : []
  if (list.length === 0) return BOSS_XP_MIN
  let total = list.reduce((sum, task) => sum + taskXpValue(task, rng), 0)
  if (list.length >= 3) total += 5
  if (list.length >= 4) total += 5
  return Math.max(BOSS_XP_MIN, Math.min(BOSS_XP_MAX, total))
}

// Randomly choose 2 to 4 weak-point tasks (clamped to what's available),
// preferring incomplete tasks. Falls back to any tasks if none are incomplete,
// and returns a single task when only one is eligible. Never returns more than
// exist; returns [] only when there are no tasks at all.
export function pickBossTasks(tasks, rng = Math.random) {
  const list = Array.isArray(tasks) ? tasks.filter(Boolean) : []
  if (list.length === 0) return []
  const incomplete = list.filter((task) => !task.completed)
  const pool = incomplete.length > 0 ? incomplete : list
  const minCount = Math.min(BOSS_MIN_TASKS, pool.length)
  const maxCount = Math.min(BOSS_MAX_TASKS, pool.length)
  const count = randInt(rng, minCount, maxCount)
  return shuffle(pool, rng).slice(0, count)
}

// Roll a full boss: pick weak points, compute the reward from those tasks, and
// build the record. The generated reward is stored on the boss so it stays
// stable after creation. Returns null when there are no eligible tasks.
export function generateBossFight(input = {}, rng = Math.random, createdAt = new Date().toISOString()) {
  const chosen = pickBossTasks(input.tasks, rng)
  if (chosen.length === 0) return null
  const rewardXp = computeBossRewardXp(chosen, rng)
  return createBossFight(
    {
      id: input.id,
      name: input.name,
      phase: input.phase,
      projectId: input.projectId ?? input.project_id,
      taskIds: chosen.map((task) => task.id),
      rewardXp,
    },
    createdAt,
  )
}
