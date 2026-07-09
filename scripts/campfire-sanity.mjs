// Lightweight sanity checks for the Campfire chat helpers. No test framework —
// run with `node scripts/campfire-sanity.mjs`. Exits non-zero on failure.
import {
  BOARD_CHANNEL_KEY,
  projectChannelKey,
  CAMPFIRE_REACTIONS,
  buildChannels,
  messageChannelKey,
  filterMessagesByChannel,
  normalizeReactions,
  reactionCount,
  hasReacted,
  toggleReaction,
  firstLine,
  renderMessageSegments,
} from '../src/lib/campfire.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// Channels
assert(BOARD_CHANNEL_KEY === 'board', 'board channel key is "board"')
assert(projectChannelKey('p1') === 'project:p1', 'project channel key is prefixed')
const channels = buildChannels([{ id: 'p1', name: 'Emberhold' }, { id: 'p2', name: '  Frostpeak  ' }])
assert(channels.length === 3, 'buildChannels returns board room + one per project')
assert(channels[0].key === 'board' && channels[0].name === 'Board Campfire', 'first room is the Board Campfire')
assert(channels[1].name === 'Emberhold Campfire', 'project room name uses the project name')
assert(channels[2].name === 'Frostpeak Campfire', 'project room name is trimmed')
assert(channels[1].projectId === 'p1', 'project room carries the project id')
assert(buildChannels([{ name: 'no id' }]).length === 1, 'projects without an id are skipped')
assert(buildChannels().length === 1, 'no projects still yields the board room')

// Message channel resolution + filtering
assert(messageChannelKey({ channelKey: 'project:p1' }) === 'project:p1', 'reads a message channel key')
assert(messageChannelKey({}) === 'board', 'a message with no channel key belongs to the board room')
assert(messageChannelKey({ channelKey: '' }) === 'board', 'a blank channel key falls back to the board room')
const msgs = [
  { id: 'm1', channelKey: 'board' },
  { id: 'm2', channelKey: 'project:p1' },
  { id: 'm3' }, // legacy row, no channel key
  { id: 'm4', channelKey: 'project:p1' },
]
assert(filterMessagesByChannel(msgs, 'board').map((m) => m.id).join(',') === 'm1,m3', 'board room includes legacy rows')
assert(filterMessagesByChannel(msgs, 'project:p1').length === 2, 'project room filters to its own messages')
assert(filterMessagesByChannel(msgs, 'project:none').length === 0, 'an empty room filters to nothing')

// Reactions: normalize / count / hasReacted
assert(Object.keys(normalizeReactions(null)).length === 0, 'normalizeReactions handles null')
assert(Object.keys(normalizeReactions([])).length === 0, 'normalizeReactions rejects arrays')
const norm = normalizeReactions({
  flame: ['u1', 'u2', 'u1'], // duplicate dropped
  bogus: ['u1'], // unknown key dropped
  quest: [], // empty dropped
  bug: ['u3', '', null, { id: 'u4' }], // blanks dropped, object id kept
})
assert(norm.flame.join(',') === 'u1,u2', 'normalizeReactions dedupes user ids')
assert(norm.bogus === undefined, 'normalizeReactions drops unknown reaction keys')
assert(norm.quest === undefined, 'normalizeReactions drops empty reaction lists')
assert(norm.bug.join(',') === 'u3,u4', 'normalizeReactions drops blanks and reads object ids')
assert(reactionCount({ flame: ['u1', 'u2'] }, 'flame') === 2, 'reactionCount counts users')
assert(reactionCount({}, 'flame') === 0, 'reactionCount is 0 for a missing key')
assert(hasReacted({ flame: ['u1'] }, 'flame', 'u1') === true, 'hasReacted true for a reacting user')
assert(hasReacted({ flame: ['u1'] }, 'flame', 'u2') === false, 'hasReacted false for a non-reacting user')
assert(hasReacted({ flame: ['u1'] }, 'flame', null) === false, 'hasReacted false with no user')

// Reactions: toggle (add / remove / drop empty / dedupe / reject unknown)
const added = toggleReaction({}, 'flame', 'u1')
assert(added.flame.join(',') === 'u1', 'toggleReaction adds a first reactor')
const addedTwo = toggleReaction(added, 'flame', 'u2')
assert(addedTwo.flame.join(',') === 'u1,u2', 'toggleReaction adds a second reactor')
const removed = toggleReaction(addedTwo, 'flame', 'u1')
assert(removed.flame.join(',') === 'u2', 'toggleReaction removes a reactor')
const emptied = toggleReaction({ flame: ['u1'] }, 'flame', 'u1')
assert(emptied.flame === undefined, 'toggleReaction drops a key that becomes empty')
assert(toggleReaction({}, 'bogus', 'u1').bogus === undefined, 'toggleReaction rejects unknown keys')
assert(Object.keys(toggleReaction({ flame: ['u1'] }, 'flame', null)).length === 1, 'toggleReaction with no user is a no-op')
assert(CAMPFIRE_REACTIONS.length === 5, 'there are five curated reactions')

// firstLine (task title from a message)
assert(firstLine('Fix the crash\nmore detail') === 'Fix the crash', 'firstLine takes the first non-empty line')
assert(firstLine('\n\n  Second line wins  \n') === 'Second line wins', 'firstLine skips blank lines and trims')
assert(firstLine('') === '', 'firstLine of empty text is empty')
assert(firstLine('x'.repeat(200)).length === 120, 'firstLine clamps to the max length')

// renderMessageSegments (safe inline formatting)
assert(renderMessageSegments('').length === 0, 'empty text renders no segments')
const plain = renderMessageSegments('just text')
assert(plain.length === 1 && plain[0].type === 'text' && plain[0].value === 'just text', 'plain text is one text segment')
const bold = renderMessageSegments('a **big** deal')
assert(bold[1].type === 'bold' && bold[1].value === 'big', 'double-star runs become bold segments')
const code = renderMessageSegments('run `npm test` now')
assert(code[1].type === 'code' && code[1].value === 'npm test', 'backtick runs become code segments')
const link = renderMessageSegments('see https://inferno.dev/docs ok')
assert(link.some((s) => s.type === 'link' && s.href === 'https://inferno.dev/docs'), 'bare URLs become link segments')
const trailing = renderMessageSegments('go to https://inferno.dev.')
const linkSeg = trailing.find((s) => s.type === 'link')
assert(linkSeg.href === 'https://inferno.dev', 'a trailing period is not swallowed into the link')
const noHtml = renderMessageSegments('<script>alert(1)</script>')
assert(noHtml.every((s) => s.type === 'text'), 'html is left as literal text (no markup produced)')
const mixed = renderMessageSegments('**bold** and `code` and https://x.io')
assert(
  mixed.some((s) => s.type === 'bold') && mixed.some((s) => s.type === 'code') && mixed.some((s) => s.type === 'link'),
  'mixed formatting parses all three kinds',
)

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll campfire sanity checks passed.')
