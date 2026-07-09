// Lightweight sanity checks for the Game Jam Quest logic. No test framework -
// run with `node scripts/quest-sanity.mjs`. Exits non-zero on failure.
import {
  QUESTS,
  JAM_STAGES,
  MAX_XP,
  XP_PER_LEVEL,
  DEFAULT_DEADLINE_SECONDS,
  getQuest,
  totalXp,
  levelForXp,
  xpIntoLevel,
  isUnlocked,
  isComplete,
  nextQuestId,
  allComplete,
  questProgress,
  stageStatus,
  formatCountdown,
  BOARD_COLUMNS,
  STUDIO_TASKS,
  TEAM,
  ROOM_ACTIONS,
  INITIAL_METERS,
  clampMeter,
  initialTasks,
  nextColumnId,
  canMoveTask,
  columnAtX,
  assignmentQuality,
  taskMeterDelta,
  computeMeters,
  studioXp,
  tasksDone,
  studioProgress,
  goodMatches,
  studioScore,
  bossResult,
  getStudioTask,
  getMember,
} from '../src/lib/questGame.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Shape
assert(QUESTS.length === 6, 'there are six quests')
assert(
  QUESTS.map((q) => q.id).join(',') ===
    'quest-board,docs-shrine,campfire,code-forge,war-room,deadline-boss',
  'quests are in the expected unlock order',
)
assert(
  QUESTS.every((q) => JAM_STAGES.some((s) => s.id === q.stage)),
  'every quest maps to a real jam stage',
)
assert(getQuest('campfire')?.node === 'Campfire', 'getQuest resolves by id')
assert(getQuest('nope') === null, 'getQuest returns null for unknown id')

// XP + level math
assert(MAX_XP === QUESTS.reduce((s, q) => s + q.xp, 0), 'MAX_XP is the sum of quest XP')
assert(totalXp([]) === 0, 'no completed quests is zero XP')
assert(totalXp(['quest-board']) === 400, 'one quest awards its XP')
assert(totalXp(['quest-board', 'bogus']) === 400, 'unknown ids are ignored in totalXp')
assert(totalXp(QUESTS.map((q) => q.id)) === MAX_XP, 'all quests complete reaches MAX_XP')
assert(levelForXp(0) === 1, 'level starts at 1')
assert(levelForXp(XP_PER_LEVEL - 1) === 1, 'just under a level boundary stays at that level')
assert(levelForXp(XP_PER_LEVEL) === 2, 'crossing a boundary raises the level')
assert(levelForXp(-50) === 1, 'negative XP clamps to level 1')
assert(xpIntoLevel(XP_PER_LEVEL + 120) === 120, 'xpIntoLevel is the remainder within a level')
assert(xpIntoLevel(0) === 0, 'xpIntoLevel is zero at a boundary')

// Unlock progression (strictly sequential)
assert(isUnlocked('quest-board', []) === true, 'first quest is unlocked from the start')
assert(isUnlocked('docs-shrine', []) === false, 'second quest is locked until the first is done')
assert(
  isUnlocked('docs-shrine', ['quest-board']) === true,
  'clearing a quest unlocks the next one',
)
assert(
  isUnlocked('deadline-boss', QUESTS.slice(0, 5).map((q) => q.id)) === true,
  'the boss unlocks after the first five quests',
)
assert(
  isUnlocked('deadline-boss', ['quest-board']) === false,
  'the boss stays locked while earlier quests remain',
)
assert(isComplete('campfire', ['campfire']) === true, 'isComplete detects a finished quest')
assert(isComplete('campfire', []) === false, 'isComplete is false for an unfinished quest')

// Next quest + completion
assert(nextQuestId([]) === 'quest-board', 'the first quest is next at the start')
assert(nextQuestId(['quest-board']) === 'docs-shrine', 'next advances as quests complete')
assert(nextQuestId(QUESTS.map((q) => q.id)) === null, 'no next quest when all are done')
assert(allComplete(QUESTS.map((q) => q.id)) === true, 'allComplete is true when everything is done')
assert(allComplete(['quest-board']) === false, 'allComplete is false mid-run')

// Progress fraction
assert(questProgress([]) === 0, 'progress is zero with nothing complete')
assert(Math.abs(questProgress(['quest-board']) - 1 / 6) < 1e-9, 'progress is 1/6 after one quest')
assert(questProgress(QUESTS.map((q) => q.id)) === 1, 'progress is full when all quests are done')

// Stage status
const freshStages = stageStatus([])
assert(freshStages[0].status === 'active', 'the first stage is active at the start')
assert(
  freshStages.slice(2).every((s) => s.status === 'locked'),
  'later stages start locked',
)
const ideaDone = stageStatus(['quest-board', 'docs-shrine'])
assert(
  ideaDone.find((s) => s.id === 'idea').status === 'done',
  'a stage is done once all its quests are complete',
)
assert(
  ideaDone.find((s) => s.id === 'team').status === 'active',
  'the following stage becomes active',
)
const allStages = stageStatus(QUESTS.map((q) => q.id))
assert(allStages.every((s) => s.status === 'done'), 'every stage is done when all quests complete')

// Countdown formatting
assert(formatCountdown(0) === '00:00:00', 'zero seconds formats as 00:00:00')
assert(formatCountdown(59) === '00:00:59', 'seconds pad correctly')
assert(formatCountdown(3661) === '01:01:01', 'hours, minutes, seconds compose correctly')
assert(formatCountdown(-10) === '00:00:00', 'negative time clamps to zero')
assert(
  formatCountdown(DEFAULT_DEADLINE_SECONDS) === '47:59:59',
  'the default deadline renders as 47:59:59',
)

// ===========================================================================
// Studio simulator: strategy scoring + drag/tap fallback logic
// ===========================================================================

// Shape
assert(STUDIO_TASKS.length === 5, 'there are five studio tasks')
assert(TEAM.length === 4, 'there are four crew members')
assert(ROOM_ACTIONS.length === 3, 'there are three room actions')
assert(
  BOARD_COLUMNS.map((c) => c.id).join(',') === 'backlog,doing,done',
  'board columns run backlog -> doing -> done',
)
assert(initialTasks().every((t) => t.col === 'backlog'), 'tasks start in the backlog')
assert(initialTasks().length === STUDIO_TASKS.length, 'initialTasks covers every task')

// Tap-to-advance fallback
assert(nextColumnId('backlog') === 'doing', 'tap advances backlog to doing')
assert(nextColumnId('doing') === 'done', 'tap advances doing to done')
assert(nextColumnId('done') === 'done', 'tap on a done card stays in done')
assert(nextColumnId('bogus') === 'backlog', 'tap on an unknown column falls back to backlog')

// Drag validity
assert(canMoveTask('backlog', 'done') === true, 'a card can be dragged across columns')
assert(canMoveTask('doing', 'doing') === false, 'dropping on the same column is not a move')
assert(canMoveTask('backlog', 'nope') === false, 'a move to an unknown column is invalid')

// Pointer hit testing for touch drag
const rects = [
  { id: 'backlog', left: 0, right: 100 },
  { id: 'doing', left: 100, right: 200 },
  { id: 'done', left: 200, right: 300 },
]
assert(columnAtX(150, rects) === 'doing', 'a pointer inside a column hits that column')
assert(columnAtX(5, rects) === 'backlog', 'a pointer in the first column hits backlog')
assert(columnAtX(-50, rects) === 'backlog', 'a pointer left of everything snaps to the nearest column')
assert(columnAtX(999, rects) === 'done', 'a pointer right of everything snaps to the last column')
assert(columnAtX(0, []) === null, 'no rects yields no column')

// Assignment quality
const designTask = getStudioTask('t-loop')
const designer = getMember('m-dante')
const artist = getMember('m-vex')
assert(assignmentQuality(designTask, designer) === 'match', 'right role is a match')
assert(assignmentQuality(designTask, artist) === 'mismatch', 'wrong role is a mismatch')
assert(assignmentQuality(designTask, null) === 'none', 'no member is none')
assert(taskMeterDelta('match').stability > 0, 'a match improves stability')
assert(taskMeterDelta('mismatch').stability < 0, 'a mismatch hurts stability')

// clampMeter
assert(clampMeter(120) === 100, 'meters clamp at 100')
assert(clampMeter(-20) === 0, 'meters clamp at 0')
assert(clampMeter(63.6) === 64, 'meters round to whole numbers')

// computeMeters is deterministic and reversible
const emptyState = { tasks: initialTasks(), assignments: {}, roomActions: [] }
assert(
  JSON.stringify(computeMeters(emptyState)) === JSON.stringify({
    time: INITIAL_METERS.time,
    morale: INITIAL_METERS.morale,
    stability: INITIAL_METERS.stability,
  }),
  'an untouched board keeps the initial meters',
)
const allMatched = {
  tasks: STUDIO_TASKS.map((t) => ({ id: t.id, col: 'done' })),
  assignments: {
    't-loop': 'm-dante',
    't-hero': 'm-vex',
    't-move': 'm-pixel',
    't-theme': 'm-echo',
    't-polish': 'm-dante',
  },
  roomActions: ['docs', 'campfire', 'forge'],
}
const matchedMeters = computeMeters(allMatched)
assert(matchedMeters.stability >= 60, 'matched crew keeps stability high')
assert(matchedMeters.time < INITIAL_METERS.time, 'doing work costs time')
const backToBacklog = computeMeters({ ...allMatched, tasks: initialTasks(), roomActions: [] })
assert(
  backToBacklog.stability === INITIAL_METERS.stability &&
    backToBacklog.morale === INITIAL_METERS.morale,
  'moving cards back out of done reverses their meter effect',
)

// XP + progress
assert(studioXp(emptyState) === 0, 'no work is no XP')
assert(tasksDone(allMatched.tasks) === 5, 'tasksDone counts finished cards')
assert(studioProgress(allMatched.tasks) === 1, 'progress is full when every task is done')
assert(goodMatches(allMatched.tasks, allMatched.assignments) === 5, 'goodMatches counts role matches')
assert(studioXp(allMatched) > 0, 'finishing work earns XP')

// Boss result tiers
const legendary = bossResult({ ...allMatched, meters: matchedMeters })
assert(legendary.tier === 'legendary', 'a clean, well-staffed jam is legendary')
assert(legendary.win === true, 'a legendary result is a win')
assert(legendary.cta.includes('real studio board'), 'a win points to the real studio board')

const mismatched = {
  tasks: STUDIO_TASKS.map((t) => ({ id: t.id, col: 'done' })),
  assignments: {
    't-loop': 'm-vex',
    't-hero': 'm-pixel',
    't-move': 'm-echo',
    't-theme': 'm-dante',
    't-polish': 'm-vex',
  },
  roomActions: [],
}
const mismatchedResult = bossResult(mismatchedResultState())
function mismatchedResultState() {
  return { ...mismatched, meters: computeMeters(mismatched) }
}
assert(mismatchedResult.tier !== 'legendary', 'all-mismatched crew is not legendary')

const halfState = {
  tasks: STUDIO_TASKS.map((t, i) => ({ id: t.id, col: i < 3 ? 'done' : 'backlog' })),
  assignments: {},
}
const halfResult = bossResult({ ...halfState, meters: computeMeters(halfState) })
assert(halfResult.tier === 'crunch', 'a half-finished jam is a crunch (partial)')
assert(halfResult.win === false, 'a partial result is not a win')

const failState = {
  tasks: STUDIO_TASKS.map((t, i) => ({ id: t.id, col: i < 1 ? 'done' : 'backlog' })),
  assignments: {},
}
const failResult = bossResult({ ...failState, meters: computeMeters(failState) })
assert(failResult.tier === 'missed', 'barely any work is a miss')
assert(failResult.cta.length > 0, 'even a miss offers a friendly next step')
assert(failResult.win === false, 'a miss is not a win')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll quest sanity checks passed.')
