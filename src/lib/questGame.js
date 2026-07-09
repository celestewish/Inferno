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

// ===========================================================================
// Game Jam Studio Simulator
// ---------------------------------------------------------------------------
// A light strategy layer on top of the landing: drag tasks across a board,
// assign the right crew member to each task, and watch three meters (Time,
// Morale, Build Stability) react. The Deadline Boss reads the final board and
// meter state to decide how the jam shipped. Everything here is pure so it can
// be exercised by scripts/quest-sanity.mjs.
// ===========================================================================

// Kanban columns, left to right. Tap-to-advance walks this order.
export const BOARD_COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done' },
]

export const ROLES = {
  design: 'Design',
  art: 'Art',
  code: 'Code',
  audio: 'Audio',
}

// The five jam tasks. Each wants a crew member of a matching role to go well.
export const STUDIO_TASKS = [
  { id: 't-loop', title: 'Prototype the core loop', role: 'design', xp: 180 },
  { id: 't-hero', title: 'Draw the hero sprite', role: 'art', xp: 160 },
  { id: 't-move', title: 'Code player movement', role: 'code', xp: 200 },
  { id: 't-theme', title: 'Compose the boss theme', role: 'audio', xp: 150 },
  { id: 't-polish', title: 'Polish the tutorial', role: 'design', xp: 170 },
]

// The crew you can drag onto tasks. One member per role.
export const TEAM = [
  { id: 'm-dante', name: 'Dante', role: 'design' },
  { id: 'm-vex', name: 'Vex', role: 'art' },
  { id: 'm-pixel', name: 'Pixel', role: 'code' },
  { id: 'm-echo', name: 'Echo', role: 'audio' },
]

// In-world room actions (workstation hotspots). Each can be triggered once and
// nudges the meters plus a little XP, without opening a heavy panel.
export const ROOM_ACTIONS = [
  {
    id: 'docs',
    label: 'Docs Shrine',
    hint: 'Read the design canon',
    icon: 'docs',
    xp: 120,
    meters: { stability: 8, time: -3 },
  },
  {
    id: 'campfire',
    label: 'Campfire',
    hint: 'Rally the crew',
    icon: 'campfire',
    xp: 120,
    meters: { morale: 14, time: -2 },
  },
  {
    id: 'forge',
    label: 'Code Forge',
    hint: 'Link the jam repo',
    icon: 'forge',
    xp: 140,
    meters: { stability: 7, time: -4 },
  },
]

export const INITIAL_METERS = { time: 100, morale: 70, stability: 55 }
export const METER_MIN = 0
export const METER_MAX = 100
export const METER_KEYS = ['time', 'morale', 'stability']

export function clampMeter(value) {
  return Math.max(METER_MIN, Math.min(METER_MAX, Math.round(value)))
}

// Fresh task state: everything starts in the backlog, unassigned.
export function initialTasks() {
  return STUDIO_TASKS.map((task) => ({ id: task.id, col: 'backlog' }))
}

export function getStudioTask(taskId) {
  return STUDIO_TASKS.find((task) => task.id === taskId) || null
}

export function getMember(memberId) {
  return TEAM.find((member) => member.id === memberId) || null
}

export function getRoomAction(actionId) {
  return ROOM_ACTIONS.find((action) => action.id === actionId) || null
}

export function columnIndex(colId) {
  return BOARD_COLUMNS.findIndex((col) => col.id === colId)
}

// Tap fallback for touch: advance a card one column to the right, stopping at
// the last column. Never moves backward, so repeated taps are safe.
export function nextColumnId(colId) {
  const index = columnIndex(colId)
  if (index < 0) return BOARD_COLUMNS[0].id
  if (index >= BOARD_COLUMNS.length - 1) return colId
  return BOARD_COLUMNS[index + 1].id
}

// A drag move is valid when both columns exist and it actually changes column.
export function canMoveTask(fromId, toId) {
  return columnIndex(fromId) >= 0 && columnIndex(toId) >= 0 && fromId !== toId
}

// Pointer-to-column hit testing for custom (touch-friendly) drag. Given a
// pointer x and the measured column rects, return the column under the pointer,
// or the nearest one by center when the pointer is outside every rect.
export function columnAtX(pointerX, rects = []) {
  if (!rects.length) return null
  for (const rect of rects) {
    if (pointerX >= rect.left && pointerX <= rect.right) return rect.id
  }
  let best = rects[0]
  let bestDistance = Infinity
  for (const rect of rects) {
    const center = (rect.left + rect.right) / 2
    const distance = Math.abs(pointerX - center)
    if (distance < bestDistance) {
      bestDistance = distance
      best = rect
    }
  }
  return best.id
}

// How well a crew member fits a task: exact role match, a mismatch, or nobody
// assigned at all.
export function assignmentQuality(task, member) {
  if (!member) return 'none'
  if (!task) return 'none'
  return task.role === member.role ? 'match' : 'mismatch'
}

// Meter change contributed by one completed task, based on its assignment.
export function taskMeterDelta(quality) {
  if (quality === 'match') return { time: -9, morale: 5, stability: 9 }
  if (quality === 'mismatch') return { time: -12, morale: -3, stability: -5 }
  return { time: -11, morale: -1, stability: -3 }
}

// Recompute the three meters from scratch given the whole studio state. Pure
// and deterministic: the same state always yields the same meters, so moving a
// card back out of Done cleanly reverses its effect.
export function computeMeters({ tasks = [], assignments = {}, roomActions = [] } = {}) {
  const meters = { ...INITIAL_METERS }
  const add = (delta) => {
    for (const key of METER_KEYS) {
      if (typeof delta[key] === 'number') meters[key] += delta[key]
    }
  }
  for (const task of tasks) {
    if (task.col !== 'done') continue
    const member = getMember(assignments[task.id])
    add(taskMeterDelta(assignmentQuality(getStudioTask(task.id), member)))
  }
  for (const actionId of roomActions) {
    const action = getRoomAction(actionId)
    if (action) add(action.meters)
  }
  return {
    time: clampMeter(meters.time),
    morale: clampMeter(meters.morale),
    stability: clampMeter(meters.stability),
  }
}

// XP from the simulator: completed tasks plus triggered room actions.
export function studioXp({ tasks = [], roomActions = [] } = {}) {
  let xp = 0
  for (const task of tasks) {
    if (task.col === 'done') xp += getStudioTask(task.id)?.xp || 0
  }
  for (const actionId of roomActions) {
    xp += getRoomAction(actionId)?.xp || 0
  }
  return xp
}

export function tasksDone(tasks = []) {
  return tasks.filter((task) => task.col === 'done').length
}

export function studioProgress(tasks = []) {
  if (!STUDIO_TASKS.length) return 0
  return tasksDone(tasks) / STUDIO_TASKS.length
}

// Count completed tasks that were done by the right role.
export function goodMatches(tasks = [], assignments = {}) {
  return tasks.filter((task) => {
    if (task.col !== 'done') return false
    const member = getMember(assignments[task.id])
    return assignmentQuality(getStudioTask(task.id), member) === 'match'
  }).length
}

// A single headline number for the results screen.
export function studioScore({ tasks = [], assignments = {}, meters = INITIAL_METERS } = {}) {
  const done = tasksDone(tasks)
  const matches = goodMatches(tasks, assignments)
  return Math.round(
    done * 120 +
      matches * 60 +
      meters.morale +
      meters.stability +
      Math.max(0, meters.time) / 2,
  )
}

// The Deadline Boss verdict. Reads task completion, crew choices, and meters to
// pick a tier. Every tier is friendly: even a miss invites a retry or signup.
export function bossResult({ tasks = [], assignments = {}, meters = INITIAL_METERS } = {}) {
  const total = STUDIO_TASKS.length
  const done = tasksDone(tasks)
  const matches = goodMatches(tasks, assignments)
  const score = studioScore({ tasks, assignments, meters })
  const outOfTime = meters.time <= 0

  let tier
  if (done >= total && !outOfTime && meters.stability >= 60 && meters.morale >= 60 && matches >= 4) {
    tier = 'legendary'
  } else if (done >= total && !outOfTime && meters.stability >= 40) {
    tier = 'shipped'
  } else if (done >= Math.ceil(total / 2)) {
    tier = 'crunch'
  } else {
    tier = 'missed'
  }

  const copy = {
    legendary: {
      title: 'Legendary launch',
      message:
        'The crew shipped a polished jam game with time to spare. Morale is high and the build is rock solid.',
      cta: 'Start your real studio board',
    },
    shipped: {
      title: 'You shipped it',
      message:
        'The game is submitted before the buzzer. A few rough edges, but the jam is beaten and the crew is proud.',
      cta: 'Start your real studio board',
    },
    crunch: {
      title: 'Shipped on fumes',
      message:
        'You got a playable build out the door, but crunch left a mark. Assign the right crew and mind the meters to ship clean.',
      cta: 'Try the jam again',
    },
    missed: {
      title: 'The jam got away',
      message:
        'Not everything made it in this time. No worries, jams are for learning. Run it back or bring your ideas into a real board.',
      cta: 'Try the jam again',
    },
  }

  return {
    tier,
    win: tier === 'legendary' || tier === 'shipped',
    done,
    total,
    matches,
    score,
    outOfTime,
    ...copy[tier],
  }
}

// ===========================================================================
// Room mini-games
// ---------------------------------------------------------------------------
// Each studio room is a short, forgiving puzzle instead of a one-shot click.
// Two shapes share one scoring model: every game has a list of `items`, each
// with a single correct `answer`. The player records a choice per item in a
// selections map ({ itemId: choiceId }). The game is solved when every item's
// choice matches its answer. Solving a room grants that room's ROOM_ACTIONS
// reward, so the meter/XP wiring in computeMeters and studioXp is unchanged.
//   kind 'select' - choose the best option per row (Docs Shrine)
//   kind 'match'  - route each card to a target (Campfire channels, Forge branches)
// ===========================================================================

export const ROOM_GAMES = {
  docs: {
    id: 'docs',
    kind: 'select',
    title: 'Assemble the design doc',
    hint: 'Pick the strongest option on each line, then seal the scroll.',
    action: 'Seal the scroll',
    items: [
      {
        id: 'pillar',
        label: 'Design pillar',
        answer: 'pillar-focus',
        options: [
          { id: 'pillar-focus', text: 'One clear fantasy' },
          { id: 'pillar-all', text: 'Ten genres at once' },
          { id: 'pillar-trend', text: 'Whatever trends this week' },
        ],
      },
      {
        id: 'loop',
        label: 'Core loop',
        answer: 'loop-tight',
        options: [
          { id: 'loop-tight', text: 'A short, tight loop' },
          { id: 'loop-cutscene', text: 'A long intro cutscene' },
          { id: 'loop-menus', text: 'Menus inside menus' },
        ],
      },
      {
        id: 'scope',
        label: 'Scope',
        answer: 'scope-slice',
        options: [
          { id: 'scope-slice', text: 'One polished slice' },
          { id: 'scope-open', text: 'A giant open world' },
          { id: 'scope-mmo', text: 'An online MMO' },
        ],
      },
    ],
  },
  campfire: {
    id: 'campfire',
    kind: 'match',
    title: 'Sort the crew chatter',
    hint: 'Send each message to the channel where it belongs.',
    action: 'Send the messages',
    targetLabel: 'Channels',
    targets: [
      { id: 'ch-build', label: '#build' },
      { id: 'ch-art', label: '#art' },
      { id: 'ch-audio', label: '#audio' },
    ],
    items: [
      { id: 'msg-jump', text: 'Player jump feels floaty', answer: 'ch-build' },
      { id: 'msg-palette', text: 'Hero sprite palette is ready', answer: 'ch-art' },
      { id: 'msg-drop', text: 'Boss theme needs a louder drop', answer: 'ch-audio' },
    ],
  },
  forge: {
    id: 'forge',
    kind: 'match',
    title: 'Wire up the repo',
    hint: 'Connect each open issue to the branch that fixes it.',
    action: 'Open the pull requests',
    targetLabel: 'Branches',
    targets: [
      { id: 'br-collision', label: 'fix/collision' },
      { id: 'br-sprite', label: 'feat/sprite-swap' },
      { id: 'br-ci', label: 'chore/build-ci' },
    ],
    items: [
      { id: 'iss-clip', text: 'Player clips through walls', answer: 'br-collision' },
      { id: 'iss-art', text: 'Swap in the new hero art', answer: 'br-sprite' },
      { id: 'iss-build', text: 'Builds fail on main', answer: 'br-ci' },
    ],
  },
}

export function getRoomGame(gameId) {
  return ROOM_GAMES[gameId] || null
}

// How many item choices are filled in, regardless of correctness.
export function roomGameAssigned(gameId, selections = {}) {
  const game = getRoomGame(gameId)
  if (!game) return 0
  return game.items.filter((item) => Boolean(selections[item.id])).length
}

// Score a set of selections for a room game. `correct` counts item choices that
// match the answer; `complete` is true once every item has a choice; `solved`
// is true only when every item is correct.
export function roomGameScore(gameId, selections = {}) {
  const game = getRoomGame(gameId)
  if (!game) return { correct: 0, total: 0, complete: false, solved: false }
  const total = game.items.length
  const correct = game.items.filter((item) => selections[item.id] === item.answer).length
  const assigned = roomGameAssigned(gameId, selections)
  return { correct, total, complete: assigned === total, solved: correct === total }
}

export function roomGameSolved(gameId, selections = {}) {
  return roomGameScore(gameId, selections).solved
}
