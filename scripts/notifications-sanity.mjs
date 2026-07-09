// Sanity checks for the Notifications center helpers. Run with
// `node scripts/notifications-sanity.mjs`. Exits non-zero on failure.
import {
  NOTIFICATION_TYPES,
  buildNotifications,
  applyReadState,
  unreadCount,
  allKeys,
} from '../src/lib/notifications.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

const projects = [
  {
    id: 'p1',
    name: 'Dungeon',
    bossFights: [
      { id: 'b1', name: 'Slime', claimed: true, defeated_at: '2026-05-01T10:00:00.000Z' },
      { id: 'b2', name: 'Unclaimed', claimed: false, defeated_at: '2026-05-02T10:00:00.000Z' },
    ],
  },
]

const meetingNotes = [
  {
    id: 'n1',
    title: 'Sprint',
    createdAt: '2026-05-03T09:00:00.000Z',
    actionItems: [
      { id: 'a1', text: 'Fix bug', done: false },
      { id: 'a2', text: 'Shipped', done: true },
      { id: 'a3', text: '  ', done: false },
    ],
  },
  {
    id: 'n2',
    title: 'Archived',
    archivedAt: '2026-05-04T09:00:00.000Z',
    createdAt: '2026-05-04T08:00:00.000Z',
    actionItems: [{ id: 'a4', text: 'Nope', done: false }],
  },
]

const messages = [
  { id: 'm1', text: 'Keep this visible', pinned: true, userId: 'u1', createdAt: '2026-05-05T09:00:00.000Z' },
  { id: 'm2', text: 'Not pinned', pinned: false, userId: 'u1', createdAt: '2026-05-06T09:00:00.000Z' },
]

const boardMembers = [
  { user_id: 'u1', created_at: '2026-04-01T09:00:00.000Z' },
  { user_id: null },
]

const invites = [
  { id: 'i1', email: 'new@studio.dev', role: 'member', createdAt: '2026-05-07T09:00:00.000Z' },
  { id: 'i2', email: 'gone@studio.dev', acceptedAt: '2026-05-08T09:00:00.000Z', createdAt: '2026-05-06T09:00:00.000Z' },
]

const profiles = { u1: 'Riley' }

const feed = buildNotifications({
  projects,
  meetingNotes,
  messages,
  boardMembers,
  profiles,
  invites,
  dailyFocusClaimed: true,
  dailyFocusDate: '2026-05-09',
})

const keys = feed.map((n) => n.key)
assert(keys.includes('boss:b1'), 'includes claimed boss notification')
assert(!keys.includes('boss:b2'), 'excludes unclaimed boss')
assert(keys.includes('quest:2026-05-09'), 'includes daily quest when claimed')
assert(keys.includes('action:n1:a1'), 'includes open action item')
assert(!keys.includes('action:n1:a2'), 'excludes done action item')
assert(!keys.includes('action:n1:a3'), 'excludes blank action item')
assert(!keys.some((k) => k.startsWith('action:n2')), 'excludes archived note action items')
assert(keys.includes('pin:m1'), 'includes pinned message')
assert(!keys.includes('pin:m2'), 'excludes unpinned message')
assert(keys.includes('member:u1'), 'includes board member')
assert(keys.includes('invite:i1'), 'includes pending invite')
assert(!keys.includes('invite:i2'), 'excludes accepted invite')

assert(feed[0].type === NOTIFICATION_TYPES.QUEST, 'sorts newest first (quest at 2026-05-09)')

// read state
const withRead = applyReadState(feed, new Set(['boss:b1', 'pin:m1']))
assert(withRead.find((n) => n.key === 'boss:b1').read === true, 'applyReadState marks known keys read')
assert(withRead.find((n) => n.key === 'invite:i1').read === false, 'applyReadState leaves others unread')
assert(unreadCount(withRead) === feed.length - 2, 'unreadCount counts remaining unread')

// applyReadState accepts arrays too
const arr = applyReadState(feed, ['member:u1'])
assert(arr.find((n) => n.key === 'member:u1').read === true, 'applyReadState accepts an array of keys')

assert(allKeys(feed).length === feed.length, 'allKeys returns every key')

// empty input
assert(buildNotifications().length === 0, 'buildNotifications tolerates empty input')
assert(unreadCount(null) === 0, 'unreadCount tolerates non-arrays')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll Notifications helper checks passed.')
