// Pure helpers for Campfire (board/project chat). No React, no Supabase, so the
// channel/reaction/render logic can be unit-tested with plain Node.

// The board-wide room. Project rooms use `project:<id>` keys so a single
// channel_key column can address both without a second table.
export const BOARD_CHANNEL_KEY = 'board'

export const projectChannelKey = (projectId) => `project:${projectId}`

// Curated RPG/flame reactions. Text label + a small glyph, never emoji-only, so
// they read the same on systems with poor emoji fonts.
export const CAMPFIRE_REACTIONS = [
  { key: 'flame', label: 'Flame', glyph: '▲' },
  { key: 'quest', label: 'Quest', glyph: '✦' },
  { key: 'bug', label: 'Bug', glyph: '✷' },
  { key: 'ship', label: 'Ship', glyph: '➤' },
  { key: 'hype', label: 'Hype', glyph: '✱' },
]

const REACTION_KEYS = new Set(CAMPFIRE_REACTIONS.map((r) => r.key))

// Build the room list for a board: the board-wide room first, then one room per
// project. Names use the project's own name so a team sees "Emberhold Campfire".
export function buildChannels(projects = []) {
  const list = Array.isArray(projects) ? projects : []
  return [
    { key: BOARD_CHANNEL_KEY, name: 'Board Campfire', projectId: null },
    ...list
      .filter((project) => project && project.id)
      .map((project) => ({
        key: projectChannelKey(project.id),
        name: `${(project.name || 'Project').trim()} Campfire`,
        projectId: project.id,
      })),
  ]
}

// A message's room. Older rows have no channel_key and belong to the board room.
export function messageChannelKey(message) {
  const key = message?.channelKey
  return typeof key === 'string' && key.length > 0 ? key : BOARD_CHANNEL_KEY
}

export function filterMessagesByChannel(messages = [], channelKey = BOARD_CHANNEL_KEY) {
  const list = Array.isArray(messages) ? messages : []
  return list.filter((message) => messageChannelKey(message) === channelKey)
}

// Reactions persist as { "<key>": ["<userId>", ...] }. Normalize any shape into
// that, dropping unknown keys, non-arrays, blanks, and duplicate user ids.
export function normalizeReactions(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!REACTION_KEYS.has(key) || !Array.isArray(value)) continue
    const seen = new Set()
    const users = []
    for (const entry of value) {
      const id = typeof entry === 'string' ? entry : entry?.id
      if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue
      seen.add(id)
      users.push(id)
    }
    if (users.length > 0) out[key] = users
  }
  return out
}

export function reactionCount(reactions, key) {
  const users = normalizeReactions(reactions)[key]
  return Array.isArray(users) ? users.length : 0
}

export function hasReacted(reactions, key, userId) {
  if (!userId) return false
  const users = normalizeReactions(reactions)[key]
  return Array.isArray(users) && users.includes(userId)
}

// Local optimistic toggle mirroring the server RPC: add the user's id if absent,
// remove it if present, and drop keys that become empty. Pure, so tests and the
// UI's optimistic update share one implementation.
export function toggleReaction(reactions, key, userId) {
  const base = normalizeReactions(reactions)
  if (!REACTION_KEYS.has(key) || !userId) return base
  const users = base[key] ? [...base[key]] : []
  const index = users.indexOf(userId)
  if (index === -1) {
    users.push(userId)
  } else {
    users.splice(index, 1)
  }
  const next = { ...base }
  if (users.length > 0) next[key] = users
  else delete next[key]
  return next
}

// First non-empty line of a message, used as the title when spinning a message
// into a task. Trimmed and length-clamped for a sane task title.
export function firstLine(text, maxLength = 120) {
  const raw = typeof text === 'string' ? text : ''
  const line = raw.split('\n').map((part) => part.trim()).find((part) => part.length > 0) || ''
  return line.length > maxLength ? line.slice(0, maxLength) : line
}

const URL_RE = /https?:\/\/[^\s<>()]+[^\s<>().,!?'"]/gi

// Split a run of plain text into text + link segments. URLs become link
// segments; everything else stays literal text. No HTML is ever produced here.
function linkifySegment(text) {
  const segments = []
  let lastIndex = 0
  let match
  URL_RE.lastIndex = 0
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'link', value: match[0], href: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

// Parse a message body into safe inline segments the UI renders as React nodes
// (never dangerouslySetInnerHTML). Supports **bold**, `code`, and bare URLs.
// Anything malformed falls back to literal text, so no markup can be injected.
export function renderMessageSegments(text) {
  const raw = typeof text === 'string' ? text : ''
  if (raw.length === 0) return []
  const segments = []
  // Match a **bold** run or a `code` run; everything between goes through the
  // URL linkifier as plain text.
  const RE = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let lastIndex = 0
  let match
  while ((match = RE.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push(...linkifySegment(raw.slice(lastIndex, match.index)))
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'bold', value: match[1] })
    } else {
      segments.push({ type: 'code', value: match[2] })
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < raw.length) {
    segments.push(...linkifySegment(raw.slice(lastIndex)))
  }
  return segments
}
