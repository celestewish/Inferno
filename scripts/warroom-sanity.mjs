// Lightweight sanity checks for the War Room helpers. No test framework — run
// with `node scripts/warroom-sanity.mjs`. Exits non-zero on failure.
import {
  BOARD_ROOM_KEY,
  projectRoomKey,
  roomProjectId,
  buildRooms,
  roomLabel,
  DEFAULT_ICE_SERVERS,
  resolveIceServers,
  SIGNAL_KINDS,
  makeSignal,
  isValidSignal,
  signalIsForMe,
  shouldInitiateOffer,
  normalizeConnectionState,
  upsertParticipant,
  removeParticipant,
  setParticipantConnection,
  reconcilePresence,
  newActionItem,
  newAgendaItem,
  normalizeAgenda,
  normalizeActionItems,
  toggleActionItemDone,
  validateMeetingNote,
  filterNotesByRoom,
} from '../src/lib/warroom.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// ── Rooms ──────────────────────────────────────────────────────────────────
assert(BOARD_ROOM_KEY === 'board', 'the board room key is "board"')
assert(projectRoomKey('abc') === 'project:abc', 'projectRoomKey prefixes with project:')
assert(roomProjectId('project:abc') === 'abc', 'roomProjectId reads the project id')
assert(roomProjectId('board') === null, 'roomProjectId is null for the board room')
assert(roomProjectId('project:') === null, 'roomProjectId is null for an empty id')
assert(roomProjectId(42) === null, 'roomProjectId ignores non-strings')

const rooms = buildRooms([{ id: 'p1', name: 'Dungeon' }, { id: 'p2', name: 'Boss' }])
assert(rooms.length === 3, 'buildRooms returns the board room plus one per project')
assert(rooms[0].key === BOARD_ROOM_KEY && rooms[0].projectId === null, 'the board room is first')
assert(rooms[1].key === 'project:p1' && rooms[1].name === 'Dungeon Huddle', 'each project gets a named Huddle')
assert(buildRooms([{ name: 'no id' }]).length === 1, 'buildRooms drops projects without an id')
assert(buildRooms(null).length === 1, 'buildRooms tolerates non-arrays')
assert(roomLabel('project:p2', [{ id: 'p2', name: 'Boss' }]) === 'Boss Huddle', 'roomLabel names a project room')
assert(roomLabel('missing', []) === 'Board War Room', 'roomLabel falls back to the board room')

// ── ICE / STUN ───────────────────────────────────────────────────────────────
assert(DEFAULT_ICE_SERVERS.length >= 1, 'there is at least one default STUN server')
assert(resolveIceServers() === DEFAULT_ICE_SERVERS, 'resolveIceServers defaults to the STUN list')
assert(resolveIceServers([]) === DEFAULT_ICE_SERVERS, 'resolveIceServers ignores an empty override')
const custom = [{ urls: 'turn:relay.example' }]
assert(resolveIceServers(custom) === custom, 'resolveIceServers honors a non-empty override')

// ── Signaling ────────────────────────────────────────────────────────────────
assert(JSON.stringify(SIGNAL_KINDS) === JSON.stringify(['offer', 'answer', 'ice']), 'the signal kinds are offer/answer/ice')
const offer = makeSignal('offer', { from: 'a', to: 'b', data: { sdp: 'x' } })
assert(offer && offer.kind === 'offer' && offer.from === 'a' && offer.to === 'b', 'makeSignal builds an addressed offer')
assert(makeSignal('offer', { from: 'a' }).to === null, 'makeSignal defaults to a room-wide target')
assert(makeSignal('bogus', { from: 'a' }) === null, 'makeSignal rejects an unknown kind')
assert(makeSignal('ice', { from: '' }) === null, 'makeSignal rejects an empty sender')
assert(isValidSignal(offer), 'isValidSignal accepts a well-formed signal')
assert(!isValidSignal({ kind: 'offer' }), 'isValidSignal rejects a signal with no sender')
assert(!isValidSignal({ kind: 'nope', from: 'a', to: null }), 'isValidSignal rejects an unknown kind')
assert(!isValidSignal(null), 'isValidSignal rejects null')
assert(signalIsForMe({ kind: 'offer', from: 'a', to: 'me' }, 'me'), 'a directly addressed signal is for me')
assert(signalIsForMe({ kind: 'ice', from: 'a', to: null }, 'me'), 'a room-wide signal is for me')
assert(!signalIsForMe({ kind: 'offer', from: 'me', to: null }, 'me'), 'my own signal is not for me')
assert(!signalIsForMe({ kind: 'offer', from: 'a', to: 'other' }, 'me'), 'a signal for someone else is not for me')
assert(shouldInitiateOffer('a', 'b'), 'the smaller id initiates the offer')
assert(!shouldInitiateOffer('b', 'a'), 'the larger id waits for the offer')
assert(!shouldInitiateOffer('a', 'a'), 'no self offer')

// ── Participant reducer ──────────────────────────────────────────────────────
assert(normalizeConnectionState('completed') === 'connected', 'completed maps to connected')
assert(normalizeConnectionState('failed') === 'disconnected', 'failed maps to disconnected')
assert(normalizeConnectionState('new') === 'connecting', 'unknown states map to connecting')

let party = upsertParticipant([], { id: 'p1', name: 'Ada' })
assert(party.length === 1 && party[0].connectionState === 'connecting', 'upsert adds a peer with a default state')
party = upsertParticipant(party, { id: 'p1', muted: true })
assert(party.length === 1 && party[0].muted === true && party[0].name === 'Ada', 'upsert merges into an existing peer')
party = setParticipantConnection(party, 'p1', 'connected')
assert(party[0].connectionState === 'connected', 'setParticipantConnection updates the state')
party = removeParticipant(party, 'p1')
assert(party.length === 0, 'removeParticipant drops the peer')

const reconciled = reconcilePresence(
  [{ id: 'p1', connectionState: 'connected', name: 'Ada' }],
  [{ id: 'p1', name: 'Ada', muted: true }, { id: 'p2', name: 'Bo' }],
)
assert(reconciled.length === 2, 'reconcilePresence adds newcomers')
assert(reconciled.find((p) => p.id === 'p1').connectionState === 'connected', 'reconcilePresence preserves connection state')
assert(reconciled.find((p) => p.id === 'p1').muted === true, 'reconcilePresence updates presence fields')
const dropped = reconcilePresence([{ id: 'p1' }, { id: 'p2' }], [{ id: 'p2' }])
assert(dropped.length === 1 && dropped[0].id === 'p2', 'reconcilePresence drops peers who left')

// ── Meeting notes / action items ─────────────────────────────────────────────
assert(newActionItem('  do it ').text === 'do it' && newActionItem().done === false, 'newActionItem trims and defaults to not done')
assert(newAgendaItem('  point ').text === 'point', 'newAgendaItem trims text')
assert(newActionItem().id && newAgendaItem().id, 'new items get ids')

assert(normalizeAgenda(['a', { text: 'b' }, '', { text: '  ' }]).length === 2, 'normalizeAgenda drops blanks')
assert(normalizeAgenda('nope').length === 0, 'normalizeAgenda tolerates non-arrays')
assert(normalizeActionItems([{ text: 'x', done: true }]).at(0).done === true, 'normalizeActionItems keeps done state')
assert(normalizeActionItems(['y'])[0].done === false, 'normalizeActionItems defaults done to false')

const items = [{ id: '1', text: 'a', done: false }, { id: '2', text: 'b', done: false }]
assert(toggleActionItemDone(items, '1')[0].done === true, 'toggleActionItemDone flips the target')
assert(toggleActionItemDone(items, '1')[1].done === false, 'toggleActionItemDone leaves others alone')

const bad = validateMeetingNote({ title: '' })
assert(bad.ok === false && bad.errors.title, 'validateMeetingNote requires a title')
const tooLong = validateMeetingNote({ title: 'x'.repeat(121) })
assert(tooLong.ok === false && tooLong.errors.title, 'validateMeetingNote rejects an overlong title')
const good = validateMeetingNote({
  title: '  Sprint sync ',
  notes: 'decisions',
  agenda: ['plan', ''],
  actionItems: [{ text: 'ship', done: true }],
  roomKey: 'project:p9',
})
assert(good.ok === true, 'validateMeetingNote accepts a valid note')
assert(good.value.title === 'Sprint sync', 'validateMeetingNote trims the title')
assert(good.value.agenda.length === 1, 'validateMeetingNote normalizes the agenda')
assert(good.value.projectId === 'p9', 'validateMeetingNote derives projectId from the room key')
assert(validateMeetingNote({ title: 'x' }).value.roomKey === BOARD_ROOM_KEY, 'validateMeetingNote defaults to the board room')
assert(validateMeetingNote({ title: 'x' }).value.projectId === null, 'the board room has no project id')

// ── Note filtering ───────────────────────────────────────────────────────────
const notes = [
  { id: '1', roomKey: 'board', createdAt: '2026-01-01', archivedAt: null },
  { id: '2', roomKey: 'board', createdAt: '2026-02-01', archivedAt: null },
  { id: '3', roomKey: 'project:p1', createdAt: '2026-03-01', archivedAt: null },
  { id: '4', roomKey: 'board', createdAt: '2026-04-01', archivedAt: '2026-05-01' },
]
const boardNotes = filterNotesByRoom(notes, 'board')
assert(boardNotes.length === 2, 'filterNotesByRoom keeps only the room, excluding archived')
assert(boardNotes[0].id === '2', 'filterNotesByRoom sorts newest first')
assert(filterNotesByRoom(notes, 'project:p1').length === 1, 'filterNotesByRoom scopes to a project room')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll War Room helper checks passed.')
