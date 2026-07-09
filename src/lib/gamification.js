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
