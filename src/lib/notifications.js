// Pure helpers for the Notifications center. Inferno does not run a background
// event pipeline; instead it derives a deterministic notification feed from the
// board data already loaded in the client, and persists only per-user read state
// (a set of notification keys) so "read" survives reloads. Every notification
// has a stable key so its read state is durable across regenerations.

const asArray = (value) => (Array.isArray(value) ? value : [])
const clip = (text, max = 140) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, max)

// Notification kinds. Kept as constants so the view and tests agree.
export const NOTIFICATION_TYPES = {
  BOSS: 'boss_defeated',
  QUEST: 'quest_complete',
  ACTION: 'action_item',
  PINNED: 'pinned_message',
  MEMBER: 'member_joined',
  INVITE: 'invite_pending',
}

// Build the full notification feed from board-scoped collections. Returns a flat
// array sorted newest-first. `now` and `todayLabel` are injectable for testing.
export function buildNotifications({
  projects = [],
  meetingNotes = [],
  messages = [],
  boardMembers = [],
  profiles = {},
  invites = [],
  dailyFocusClaimed = false,
  dailyFocusDate = '',
} = {}) {
  const rows = []

  // Boss fights that have been defeated + claimed are milestone wins worth a note.
  for (const project of asArray(projects)) {
    for (const boss of asArray(project?.bossFights)) {
      if (!boss || !boss.claimed) continue
      rows.push({
        key: `boss:${boss.id}`,
        type: NOTIFICATION_TYPES.BOSS,
        title: 'Boss defeated',
        body: clip(`${boss.name || 'A boss'} fell in ${project.name || 'a project'}.`),
        entityType: 'project',
        entityId: project.id,
        createdAt: boss.defeated_at || boss.created_at || '',
      })
    }
  }

  // Daily focus completion (today only; ephemeral but useful the day it lands).
  if (dailyFocusClaimed && dailyFocusDate) {
    rows.push({
      key: `quest:${dailyFocusDate}`,
      type: NOTIFICATION_TYPES.QUEST,
      title: 'Daily quest complete',
      body: 'You cleared today’s focus quests. Momentum earned.',
      entityType: 'quest',
      entityId: dailyFocusDate,
      createdAt: `${dailyFocusDate}T23:59:59.000Z`,
    })
  }

  // Open meeting action items are the concrete next steps a huddle produced.
  for (const note of asArray(meetingNotes)) {
    if (!note || note.archivedAt) continue
    for (const item of asArray(note.actionItems)) {
      if (!item || item.done || !clip(item.text)) continue
      rows.push({
        key: `action:${note.id}:${item.id}`,
        type: NOTIFICATION_TYPES.ACTION,
        title: 'Open action item',
        body: clip(`${item.text} (from ${note.title || 'a meeting'})`),
        entityType: 'meeting_note',
        entityId: note.id,
        createdAt: note.createdAt || '',
      })
    }
  }

  // Pinned Campfire messages are things the team wanted to keep visible.
  for (const message of asArray(messages)) {
    if (!message || !message.pinned) continue
    const author = profiles[message.userId] || 'A teammate'
    rows.push({
      key: `pin:${message.id}`,
      type: NOTIFICATION_TYPES.PINNED,
      title: 'Pinned message',
      body: clip(`${author}: ${message.text}`),
      entityType: 'message',
      entityId: message.id,
      createdAt: message.createdAt || '',
    })
  }

  // Board members and pending invites cover the "who is on the team" events.
  for (const member of asArray(boardMembers)) {
    const id = member?.user_id
    if (!id) continue
    rows.push({
      key: `member:${id}`,
      type: NOTIFICATION_TYPES.MEMBER,
      title: 'Team member',
      body: clip(`${profiles[id] || 'A teammate'} is on this board.`),
      entityType: 'member',
      entityId: id,
      createdAt: member.created_at || member.joined_at || '',
    })
  }

  for (const invite of asArray(invites)) {
    if (!invite?.id || invite.acceptedAt) continue
    rows.push({
      key: `invite:${invite.id}`,
      type: NOTIFICATION_TYPES.INVITE,
      title: 'Invite pending',
      body: clip(`${invite.email || 'Someone'} was invited as ${invite.role || 'member'}.`),
      entityType: 'invite',
      entityId: invite.id,
      createdAt: invite.createdAt || invite.created_at || '',
    })
  }

  return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

// Attach a `read` boolean to each notification from a Set (or array) of read keys.
export function applyReadState(notifications, readKeys) {
  const set = readKeys instanceof Set ? readKeys : new Set(asArray(readKeys))
  return asArray(notifications).map((n) => ({ ...n, read: set.has(n.key) }))
}

export function unreadCount(notifications) {
  return asArray(notifications).filter((n) => n && !n.read).length
}

// All keys currently in the feed, used by "mark all read" to persist a read row
// for everything the user can presently see.
export function allKeys(notifications) {
  return asArray(notifications).map((n) => n.key)
}
