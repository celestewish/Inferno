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

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll quest sanity checks passed.')
