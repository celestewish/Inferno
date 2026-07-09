import { useEffect, useMemo, useRef, useState } from 'react'
import useWarRoomVoice from './useWarRoomVoice'
import {
  buildRooms,
  filterNotesByRoom,
  newAgendaItem,
  newActionItem,
  roomProjectId,
  validateMeetingNote,
  BOARD_ROOM_KEY,
} from '../lib/warroom'
import {
  HeadsetIcon,
  MicIcon,
  MicOffIcon,
  LeaveCallIcon,
  PlusIcon,
  CloseIcon,
  EditIcon,
  ArchiveIcon,
  TasksIcon,
} from './Icons'

const STATE_LABEL = { connecting: 'Connecting', connected: 'Connected', disconnected: 'Reconnecting' }

// A single hidden audio sink for a remote peer. Join is the user gesture, so
// autoplay of live audio is permitted. Nothing is recorded or stored.
function RemoteAudio({ stream }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream
  }, [stream])
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} aria-hidden="true" />
}

const emptyDraft = (roomKey) => ({
  id: null,
  title: '',
  notes: '',
  agenda: [],
  actionItems: [],
  roomKey,
})

export default function WarRoomView({
  boardId,
  self,
  projects = [],
  notes = [],
  migrationMissing = false,
  onCreateNote,
  onUpdateNote,
  onArchiveNote,
  onCreateTaskFromAction,
}) {
  const [selectedRoomKey, setSelectedRoomKey] = useState(BOARD_ROOM_KEY)
  const rooms = useMemo(() => buildRooms(projects), [projects])
  const voice = useWarRoomVoice({ boardId, self })

  const [draft, setDraft] = useState(() => emptyDraft(BOARD_ROOM_KEY))
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const activeRoom = rooms.find((room) => room.key === selectedRoomKey) || rooms[0]
  const roomNotes = useMemo(() => filterNotesByRoom(notes, selectedRoomKey), [notes, selectedRoomKey])
  const inCall = voice.status === 'connecting' || voice.status === 'connected'

  // Voice is pinned to the room you joined; switching rooms requires leaving.
  const selectRoom = (key) => {
    if (inCall) return
    setSelectedRoomKey(key)
    if (formOpen) resetForm(key)
  }

  const resetForm = (roomKey = selectedRoomKey) => {
    setDraft(emptyDraft(roomKey))
    setFormError('')
    setFormOpen(false)
  }

  const openNew = () => {
    setDraft(emptyDraft(selectedRoomKey))
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (note) => {
    setDraft({
      id: note.id,
      title: note.title || '',
      notes: note.notes || '',
      agenda: (note.agenda || []).map((item) => ({ id: item.id || newAgendaItem().id, text: item.text || '' })),
      actionItems: (note.actionItems || []).map((item) => ({
        id: item.id || newActionItem().id,
        text: item.text || '',
        done: Boolean(item.done),
      })),
      roomKey: note.roomKey || selectedRoomKey,
    })
    setFormError('')
    setFormOpen(true)
  }

  const saveDraft = async () => {
    const projectId = roomProjectId(selectedRoomKey)
    const result = validateMeetingNote({ ...draft, roomKey: selectedRoomKey, projectId })
    if (!result.ok) {
      setFormError(result.errors.title || 'Check the highlighted fields.')
      return
    }
    setSaving(true)
    const handler = draft.id ? onUpdateNote : onCreateNote
    const outcome = draft.id
      ? await handler?.(draft.id, result.value)
      : await handler?.(result.value)
    setSaving(false)
    if (outcome && outcome.ok === false) {
      setFormError(outcome.message || 'Could not save the meeting notes.')
      return
    }
    resetForm()
  }

  if (!self?.id) {
    return (
      <section className="warroom-view" data-testid="warroom-view" aria-label="War Room">
        <header className="view-header">
          <div>
            <p className="eyebrow">Meet</p>
            <h1>War Room</h1>
            <p className="muted-copy">Sign in to join a huddle and take meeting notes.</p>
          </div>
        </header>
      </section>
    )
  }

  const displayParticipants = voice.participants.map((p) =>
    p.id === self.id ? { ...p, muted: voice.muted, connectionState: 'connected', isSelf: true } : p,
  )
  const selfPresent = displayParticipants.some((p) => p.isSelf)
  const roster = selfPresent
    ? displayParticipants
    : inCall
      ? [{ id: self.id, name: self.name || self.email || 'You', muted: voice.muted, connectionState: 'connected', isSelf: true }, ...displayParticipants]
      : displayParticipants

  return (
    <section className="warroom-view" data-testid="warroom-view" aria-label="War Room">
      <header className="view-header">
        <div>
          <p className="eyebrow">Meet</p>
          <h1>War Room</h1>
          <p className="muted-copy">
            Gather the party, talk it out, and turn the plan into tasks. No Discord required.
          </p>
        </div>
      </header>

      <div className="warroom-rooms" role="group" aria-label="Choose a huddle">
        {rooms.map((room) => (
          <button
            key={room.key}
            type="button"
            className={`warroom-room-chip${room.key === selectedRoomKey ? ' is-active' : ''}`}
            aria-pressed={room.key === selectedRoomKey}
            onClick={() => selectRoom(room.key)}
            disabled={inCall && room.key !== selectedRoomKey}
            data-testid={`warroom-room-${room.key}`}
          >
            {room.name}
          </button>
        ))}
      </div>

      <div className="warroom-grid">
        <section className="warroom-voice panel" aria-label="Voice huddle">
          <div className="warroom-voice-head">
            <span className="warroom-voice-title">
              <HeadsetIcon size={18} /> {activeRoom?.name}
            </span>
            <span className={`warroom-status warroom-status-${voice.status}`} data-testid="warroom-status">
              {voice.status === 'connected'
                ? 'Live'
                : voice.status === 'connecting'
                  ? 'Connecting'
                  : voice.status === 'requesting'
                    ? 'Requesting mic'
                    : voice.status === 'denied'
                      ? 'Mic blocked'
                      : voice.status === 'error'
                        ? 'Unavailable'
                        : 'Idle'}
            </span>
          </div>

          <p className="warroom-privacy">Audio is live only. Inferno does not record huddles.</p>

          {!voice.supported ? (
            <p className="warroom-note" role="status">
              This browser does not support voice huddles. Meeting notes still work below.
            </p>
          ) : null}

          {voice.status === 'denied' ? (
            <p className="warroom-note warroom-note-warn" role="alert">
              {voice.errorMessage} You can still use meeting notes below.
            </p>
          ) : null}

          {voice.status === 'error' && voice.errorMessage ? (
            <p className="warroom-note warroom-note-warn" role="alert">
              {voice.errorMessage}
            </p>
          ) : null}

          <div className="warroom-controls">
            {!inCall ? (
              <button
                type="button"
                className="primary-btn warroom-join"
                onClick={() => voice.join(activeRoom)}
                disabled={!voice.supported || voice.status === 'requesting'}
                data-testid="warroom-join"
              >
                <HeadsetIcon size={16} /> {voice.status === 'requesting' ? 'Requesting mic' : 'Join Huddle'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`ghost-btn warroom-mute${voice.muted ? ' is-muted' : ''}`}
                  onClick={voice.toggleMute}
                  aria-pressed={voice.muted}
                  data-testid="warroom-mute"
                >
                  {voice.muted ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
                  {voice.muted ? 'Muted' : 'Mic On'}
                </button>
                <button
                  type="button"
                  className="ghost-btn warroom-leave"
                  onClick={voice.leave}
                  data-testid="warroom-leave"
                >
                  <LeaveCallIcon size={16} /> Leave Huddle
                </button>
              </>
            )}
          </div>

          <div className="warroom-party">
            <p className="warroom-subhead">Around the Table</p>
            {roster.length === 0 ? (
              <p className="warroom-empty">No one is in the huddle yet.</p>
            ) : (
              <ul className="warroom-party-list">
                {roster.map((p) => (
                  <li key={p.id} className="warroom-party-row" data-testid="warroom-participant">
                    <span className="warroom-avatar" aria-hidden="true">
                      {(p.name || 'T').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="warroom-party-name">
                      {p.name}
                      {p.isSelf ? ' (you)' : ''}
                    </span>
                    <span className="warroom-party-meta">
                      {p.muted ? <MicOffIcon size={14} /> : <MicIcon size={14} />}
                      {!p.isSelf ? (
                        <span className={`warroom-conn warroom-conn-${p.connectionState}`}>
                          {STATE_LABEL[p.connectionState] || 'Connecting'}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {voice.remoteStreams.map((entry) => (
            <RemoteAudio key={entry.id} stream={entry.stream} />
          ))}
        </section>

        <section className="warroom-notes panel" aria-label="Meeting notes">
          <div className="warroom-notes-head">
            <p className="warroom-subhead">Meeting Notes</p>
            {!formOpen ? (
              <button type="button" className="ghost-btn" onClick={openNew} data-testid="warroom-new-note">
                <PlusIcon size={16} /> New Meeting
              </button>
            ) : null}
          </div>

          {migrationMissing ? (
            <p className="warroom-note" role="status">
              Apply the War Room migration (supabase db push) to save meeting notes for this board.
            </p>
          ) : null}

          {formOpen ? (
            <div className="warroom-note-form" data-testid="warroom-note-form">
              <label className="warroom-field">
                <span>Meeting title</span>
                <input
                  type="text"
                  value={draft.title}
                  maxLength={120}
                  placeholder="Sprint planning, art review, boss fight sync..."
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  data-testid="warroom-note-title"
                />
              </label>

              <div className="warroom-field">
                <div className="warroom-field-head">
                  <span>Agenda</span>
                  <button
                    type="button"
                    className="warroom-mini-btn"
                    onClick={() => setDraft((d) => ({ ...d, agenda: [...d.agenda, newAgendaItem()] }))}
                  >
                    <PlusIcon size={14} /> Add
                  </button>
                </div>
                {draft.agenda.map((item) => (
                  <div key={item.id} className="warroom-list-row">
                    <input
                      type="text"
                      value={item.text}
                      placeholder="Agenda point"
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          agenda: d.agenda.map((a) => (a.id === item.id ? { ...a, text: e.target.value } : a)),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="warroom-mini-btn"
                      aria-label="Remove agenda item"
                      onClick={() =>
                        setDraft((d) => ({ ...d, agenda: d.agenda.filter((a) => a.id !== item.id) }))
                      }
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <label className="warroom-field">
                <span>Notes</span>
                <textarea
                  rows={4}
                  value={draft.notes}
                  placeholder="Decisions, blockers, and anything worth remembering."
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  data-testid="warroom-note-body"
                />
              </label>

              <div className="warroom-field">
                <div className="warroom-field-head">
                  <span>Action Items</span>
                  <button
                    type="button"
                    className="warroom-mini-btn"
                    onClick={() => setDraft((d) => ({ ...d, actionItems: [...d.actionItems, newActionItem()] }))}
                  >
                    <PlusIcon size={14} /> Add
                  </button>
                </div>
                {draft.actionItems.map((item) => (
                  <div key={item.id} className="warroom-list-row">
                    <input
                      type="checkbox"
                      checked={item.done}
                      aria-label="Mark action item done"
                      onChange={() =>
                        setDraft((d) => ({
                          ...d,
                          actionItems: d.actionItems.map((a) =>
                            a.id === item.id ? { ...a, done: !a.done } : a,
                          ),
                        }))
                      }
                    />
                    <input
                      type="text"
                      value={item.text}
                      placeholder="Owner + what happens next"
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          actionItems: d.actionItems.map((a) =>
                            a.id === item.id ? { ...a, text: e.target.value } : a,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="warroom-mini-btn"
                      aria-label="Remove action item"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          actionItems: d.actionItems.filter((a) => a.id !== item.id),
                        }))
                      }
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {formError ? <p className="warroom-form-error" role="alert">{formError}</p> : null}

              <div className="warroom-form-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={saveDraft}
                  disabled={saving}
                  data-testid="warroom-save-note"
                >
                  {saving ? 'Saving' : draft.id ? 'Save Changes' : 'Save Meeting'}
                </button>
                <button type="button" className="ghost-btn" onClick={() => resetForm()}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {roomNotes.length === 0 && !formOpen ? (
            <p className="warroom-empty">No meeting notes yet for this huddle.</p>
          ) : null}

          <ul className="warroom-note-list">
            {roomNotes.map((note) => (
              <li key={note.id} className="warroom-note-card" data-testid="warroom-note-card">
                <div className="warroom-note-card-head">
                  <h3>{note.title}</h3>
                  <div className="warroom-note-card-actions">
                    <button type="button" className="icon-btn" aria-label="Edit meeting" onClick={() => openEdit(note)}>
                      <EditIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Archive meeting"
                      onClick={() => onArchiveNote?.(note)}
                    >
                      <ArchiveIcon size={15} />
                    </button>
                  </div>
                </div>

                {note.agenda?.length ? (
                  <div className="warroom-note-section">
                    <p className="warroom-note-label">Agenda</p>
                    <ul className="warroom-bullet">
                      {note.agenda.map((item) => (
                        <li key={item.id}>{item.text}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {note.notes ? <p className="warroom-note-body">{note.notes}</p> : null}

                {note.actionItems?.length ? (
                  <div className="warroom-note-section">
                    <p className="warroom-note-label">Action Items</p>
                    <ul className="warroom-action-list">
                      {note.actionItems.map((item) => (
                        <li key={item.id} className={`warroom-action${item.done ? ' is-done' : ''}`}>
                          <span>{item.text}</span>
                          {onCreateTaskFromAction ? (
                            <button
                              type="button"
                              className="warroom-mini-btn"
                              onClick={() => onCreateTaskFromAction(item.text)}
                            >
                              <TasksIcon size={13} /> Create Task
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
