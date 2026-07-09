// Pure, framework-free logic for the Game Jam Quest landing experience.
// No React, no DOM, no Supabase - just data and math so it can be unit tested
// with `node scripts/quest-sanity.mjs`. The QuestLanding component drives all
// presentation and interaction state on top of these helpers.

// The five jam stages shown in the HUD progress track. Quests map onto these.
export const JAM_STAGES = [
  { id: 'idea', label: 'Idea' },
  { id: 'team', label: 'Team' },
  { id: 'build', label: 'Build' },
  { id: 'polish', label: 'Polish' },
  { id: 'submit', label: 'Submit' },
]

// XP required to clear each level. Level 1 starts at 0 XP; each level costs a
// fixed 500 XP so the HUD bar math stays simple and predictable.
export const XP_PER_LEVEL = 500

// The six quests, in unlock order. Each teaches one Inferno surface through a
// small interaction rather than a feature card. Dante's intro/outro lines carry
// the narration. `icon` is a key the component maps to an SVG in Icons.jsx.
export const QUESTS = [
  {
    id: 'quest-board',
    node: 'Quest Board',
    stage: 'idea',
    icon: 'board',
    xp: 400,
    objective: 'Move three jam tasks from To Do to Done.',
    tagline: 'Plan the jam on a living board.',
    danteIntro:
      'Every great jam starts with a plan. Drag these tasks across the board and watch the work come alive.',
    danteOutro: 'That is the heartbeat of Inferno. A board that moves as fast as your ideas.',
    action: 'Advance a task',
  },
  {
    id: 'docs-shrine',
    node: 'Docs Shrine',
    stage: 'idea',
    icon: 'docs',
    xp: 400,
    objective: 'Inspect the game design note at the shrine.',
    tagline: 'Keep the design canon in one place.',
    danteIntro:
      'The shrine holds our design canon. Read the note so the whole party shares one truth.',
    danteOutro: 'Docs live beside the work, not in some forgotten drawer. Now everyone is aligned.',
    action: 'Read the note',
  },
  {
    id: 'campfire',
    node: 'Campfire',
    stage: 'team',
    icon: 'campfire',
    xp: 500,
    objective: 'Rally the party with a campfire message.',
    tagline: 'Talk in channels, right where the work lives.',
    danteIntro:
      'A jam is nothing without a crew. Send a rallying cry around the campfire and gather the party.',
    danteOutro: 'Conversation stays attached to the work. No more lost threads across five apps.',
    action: 'Send a rally',
  },
  {
    id: 'code-forge',
    node: 'Code Forge',
    stage: 'build',
    icon: 'forge',
    xp: 600,
    objective: 'Link a repo and copy its clone command.',
    tagline: 'Bind repos to the board they power.',
    danteIntro:
      'Time to build. Link the jam repo at the forge and grab the clone command to start hacking.',
    danteOutro: 'Every repo is now bound to the work it powers. The forge never forgets.',
    action: 'Link the repo',
  },
  {
    id: 'war-room',
    node: 'War Room',
    stage: 'polish',
    icon: 'warroom',
    xp: 600,
    objective: 'Clear the standup checklist in the war room.',
    tagline: 'Run tight standups and polish passes.',
    danteIntro:
      'The deadline looms. Run a lightning standup and lock in the polish pass before we ship.',
    danteOutro: 'Standups that take minutes, not meetings. The party is battle ready.',
    action: 'Check an item',
  },
  {
    id: 'deadline-boss',
    node: 'Deadline Boss',
    stage: 'submit',
    icon: 'boss',
    xp: 900,
    objective: 'Complete the launch checklist and beat the deadline.',
    tagline: 'Ship before the clock hits zero.',
    danteIntro:
      'This is it. The Deadline Boss. Clear the launch checklist and submit before the timer burns out.',
    danteOutro: 'You beat the jam. This is what shipping with Inferno feels like every single time.',
    action: 'Finish the launch',
  },
]

// Total XP available across every quest. Drives the HUD "XP / max" readout.
export const MAX_XP = QUESTS.reduce((sum, quest) => sum + quest.xp, 0)

export function getQuest(questId) {
  return QUESTS.find((quest) => quest.id === questId) || null
}

// XP earned so far from a set of completed quest ids. Unknown ids are ignored.
export function totalXp(completedIds = []) {
  const done = new Set(completedIds)
  return QUESTS.reduce((sum, quest) => (done.has(quest.id) ? sum + quest.xp : sum), 0)
}

// Level is 1-based. Every XP_PER_LEVEL of XP grants a level.
export function levelForXp(xp = 0) {
  const safe = Math.max(0, xp)
  return Math.floor(safe / XP_PER_LEVEL) + 1
}

// XP accumulated inside the current level (0..XP_PER_LEVEL).
export function xpIntoLevel(xp = 0) {
  const safe = Math.max(0, xp)
  return safe % XP_PER_LEVEL
}

// Quests are unlocked strictly in array order: the first is always open, and
// each later quest opens once the one before it is complete.
export function isUnlocked(questId, completedIds = []) {
  const index = QUESTS.findIndex((quest) => quest.id === questId)
  if (index <= 0) return index === 0
  const done = new Set(completedIds)
  return done.has(QUESTS[index - 1].id)
}

export function isComplete(questId, completedIds = []) {
  return completedIds.includes(questId)
}

// The next quest the player should tackle, or null when everything is done.
export function nextQuestId(completedIds = []) {
  const done = new Set(completedIds)
  const next = QUESTS.find((quest) => !done.has(quest.id))
  return next ? next.id : null
}

export function allComplete(completedIds = []) {
  return nextQuestId(completedIds) === null
}

// Fraction (0..1) of quests completed, for the HUD progress bar.
export function questProgress(completedIds = []) {
  if (!QUESTS.length) return 0
  const done = new Set(completedIds)
  const count = QUESTS.filter((quest) => done.has(quest.id)).length
  return count / QUESTS.length
}

// Status of each jam stage given the completed quests. A stage is:
//   'done'    - every quest in the stage is complete
//   'active'  - not done, but at least one quest is complete or unlocked
//   'locked'  - no quest in the stage is reachable yet
export function stageStatus(completedIds = []) {
  const done = new Set(completedIds)
  return JAM_STAGES.map((stage) => {
    const stageQuests = QUESTS.filter((quest) => quest.stage === stage.id)
    const total = stageQuests.length
    const completed = stageQuests.filter((quest) => done.has(quest.id)).length
    let status = 'locked'
    if (total > 0 && completed === total) {
      status = 'done'
    } else if (stageQuests.some((quest) => done.has(quest.id) || isUnlocked(quest.id, completedIds))) {
      status = 'active'
    }
    return { ...stage, total, completed, status }
  })
}

// Format a whole number of seconds as HH:MM:SS, clamped at zero. Used for the
// live jam deadline countdown in the HUD.
export function formatCountdown(secondsLeft = 0) {
  const safe = Math.max(0, Math.floor(secondsLeft))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// Default seconds on the jam clock when the page loads (47:59:59, matching the
// design reference). Exported so the component and tests agree on the value.
export const DEFAULT_DEADLINE_SECONDS = 47 * 3600 + 59 * 60 + 59
