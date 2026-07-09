// Pure helpers for War Room (voice huddles + meeting notes). No React, no
// Supabase, no WebRTC globals, so room-key logic, signaling payloads, the
// participant reducer, and note/action-item validation can be unit-tested with
// plain Node. The React hook (useWarRoomVoice) and view build on top of these.

// ── Rooms ────────────────────────────────────────────────────────────────────
// A huddle room is virtual: the board-wide room plus one per project. Keys reuse
// the Campfire convention ('board' / 'project:<id>') so no rooms table is needed.
export const BOARD_ROOM_KEY = 'board'

export const projectRoomKey = (projectId) => `project:${projectId}`

// The project a room_key belongs to, or null for the board room.
export function roomProjectId(key) {
  if (typeof key !== 'string' || !key.startsWith('project:')) return null
  const id = key.slice('project:'.length).split(':')[0]
  return id || null
}

// Build the selectable huddle list: the board room first, then one per project.
export function buildRooms(projects = []) {
  const list = (Array.isArray(projects) ? projects : []).filter((p) => p && p.id)
  return [
    { key: BOARD_ROOM_KEY, name: 'Board War Room', projectId: null },
    ...list.map((p) => ({
      key: projectRoomKey(p.id),
      name: `${(p.name || 'Project').trim()} Huddle`,
      projectId: p.id,
    })),
  ]
}

// Human label for a room key, given the project list for name lookup.
export function roomLabel(key, projects = []) {
  return buildRooms(projects).find((room) => room.key === key)?.name || 'Board War Room'
}

// ── ICE / STUN configuration ─────────────────────────────────────────────────
// Public STUN only. This covers most home/office NATs but NOT symmetric NATs,
// which need a TURN relay. TURN is a documented follow-up (see PR notes); keep
// the list overridable so a TURN entry can be added without code changes.
export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function resolveIceServers(override) {
  return Array.isArray(override) && override.length > 0 ? override : DEFAULT_ICE_SERVERS
}

// ── Signaling payloads ───────────────────────────────────────────────────────
// Broadcast over a Supabase Realtime channel scoped to board + room. No audio is
// ever sent here, only SDP offers/answers and ICE candidates addressed to a
// specific peer. `to` targets a peer; a null `to` would be a room-wide message.
export const SIGNAL_KINDS = ['offer', 'answer', 'ice']

export function makeSignal(kind, { from, to = null, data = null } = {}) {
  if (!SIGNAL_KINDS.includes(kind)) return null
  if (typeof from !== 'string' || from.length === 0) return null
  return { kind, from, to, data }
}

export function isValidSignal(signal) {
  if (!signal || typeof signal !== 'object') return false
  if (!SIGNAL_KINDS.includes(signal.kind)) return false
  if (typeof signal.from !== 'string' || signal.from.length === 0) return false
  if (signal.to !== null && typeof signal.to !== 'string') return false
  return true
}

// A signal is for me if it targets me specifically, or is room-wide (to === null)
// and not one I sent myself.
export function signalIsForMe(signal, myId) {
  if (!isValidSignal(signal) || !myId) return false
  if (signal.from === myId) return false
  return signal.to === null || signal.to === myId
}

// Deterministic glare avoidance: exactly one peer initiates the offer for any
// pair. The lexicographically smaller id calls the larger. Order-independent, so
// it holds whether we discover a peer on initial sync or a later join.
export function shouldInitiateOffer(myId, peerId) {
  if (typeof myId !== 'string' || typeof peerId !== 'string' || myId === peerId) return false
  return myId < peerId
}

// ── Participant reducer ──────────────────────────────────────────────────────
// The participant list is derived from presence + per-peer connection state. The
// reducer is pure so the UI's optimistic updates and tests share one path.
export const CONNECTION_STATES = ['connecting', 'connected', 'disconnected']

export function normalizeConnectionState(state) {
  // Map the RTCPeerConnection.connectionState set onto our three display states.
  switch (state) {
    case 'connected':
    case 'completed':
      return 'connected'
    case 'disconnected':
    case 'failed':
    case 'closed':
      return 'disconnected'
    default:
      return 'connecting'
  }
}

export function upsertParticipant(participants, participant) {
  const list = Array.isArray(participants) ? participants : []
  if (!participant || !participant.id) return list
  const existing = list.find((p) => p.id === participant.id)
  if (!existing) return [...list, { connectionState: 'connecting', muted: false, ...participant }]
  return list.map((p) => (p.id === participant.id ? { ...p, ...participant } : p))
}

export function removeParticipant(participants, id) {
  return (Array.isArray(participants) ? participants : []).filter((p) => p.id !== id)
}

export function setParticipantConnection(participants, id, state) {
  const next = normalizeConnectionState(state)
  return (Array.isArray(participants) ? participants : []).map((p) =>
    p.id === id ? { ...p, connectionState: next } : p,
  )
}

// Reconcile the participant list against a fresh presence roster (array of
// {id, name, email, muted}). Adds newcomers, updates presence fields, and drops
// anyone who left, while preserving each surviving peer's connectionState.
export function reconcilePresence(participants, roster) {
  const current = Array.isArray(participants) ? participants : []
  const rows = Array.isArray(roster) ? roster.filter((r) => r && r.id) : []
  const ids = new Set(rows.map((r) => r.id))
  const kept = current.filter((p) => ids.has(p.id))
  let next = kept
  for (const row of rows) {
    next = upsertParticipant(next, row)
  }
  return next
}

// ── Meeting notes / action items ─────────────────────────────────────────────
export function newActionItem(text = '') {
  return { id: cryptoId(), text: String(text || '').trim(), done: false }
}

export function newAgendaItem(text = '') {
  return { id: cryptoId(), text: String(text || '').trim() }
}

// Best-effort id that works in Node tests and the browser without extra deps.
function cryptoId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function normalizeAgenda(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const text = typeof item === 'string' ? item : item?.text
      const trimmed = String(text || '').trim()
      if (!trimmed) return null
      return { id: (item && item.id) || cryptoId(), text: trimmed.slice(0, 200) }
    })
    .filter(Boolean)
    .slice(0, 50)
}

export function normalizeActionItems(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const text = typeof item === 'string' ? item : item?.text
      const trimmed = String(text || '').trim()
      if (!trimmed) return null
      return {
        id: (item && item.id) || cryptoId(),
        text: trimmed.slice(0, 200),
        done: Boolean(item && item.done),
      }
    })
    .filter(Boolean)
    .slice(0, 50)
}

export function toggleActionItemDone(items, id) {
  return (Array.isArray(items) ? items : []).map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  )
}

// Validate a meeting note form. Returns { ok, value?, errors? }. Title is
// required; agenda/notes/action items are optional and normalized. projectId is
// carried through (null for the board room).
export function validateMeetingNote(input = {}) {
  const errors = {}
  const title = String(input.title || '').trim()
  if (!title) {
    errors.title = 'Add a meeting title.'
  } else if (title.length > 120) {
    errors.title = 'Keep the title under 120 characters.'
  }

  const notes = String(input.notes || '').slice(0, 20000)
  const agenda = normalizeAgenda(input.agenda)
  const actionItems = normalizeActionItems(input.actionItems)
  const roomKey = typeof input.roomKey === 'string' && input.roomKey ? input.roomKey : BOARD_ROOM_KEY
  const projectId = input.projectId ? String(input.projectId) : roomProjectId(roomKey)

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { title: title.slice(0, 120), notes, agenda, actionItems, roomKey, projectId: projectId || null },
  }
}

// Filter notes to a room, excluding archived, newest first (by createdAt).
export function filterNotesByRoom(notes = [], roomKey = BOARD_ROOM_KEY) {
  const list = Array.isArray(notes) ? notes : []
  return list
    .filter((note) => note && !note.archivedAt && (note.roomKey || BOARD_ROOM_KEY) === roomKey)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}
