import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  BOARD_COLUMNS,
  STUDIO_TASKS,
  TEAM,
  ROOM_ACTIONS,
  ROLES,
  MAX_XP,
  XP_PER_LEVEL,
  DEFAULT_DEADLINE_SECONDS,
  initialTasks,
  nextColumnId,
  canMoveTask,
  getStudioTask,
  getMember,
  getRoomAction,
  assignmentQuality,
  computeMeters,
  studioXp,
  levelForXp,
  xpIntoLevel,
  tasksDone,
  studioProgress,
  bossResult,
  formatCountdown,
  getRoomGame,
  roomGameScore,
  roomGameSolved,
} from '../lib/questGame'
import InfernoLogo from './InfernoLogo'
import {
  BoardIcon,
  BookIcon,
  FlameIcon,
  ForgeIcon,
  TrophyIcon,
  CheckIcon,
  CloseIcon,
  CalendarIcon,
  TeamIcon,
  CommandIcon,
} from './Icons'

const ROOM_ICONS = { docs: BookIcon, campfire: FlameIcon, forge: ForgeIcon }
const METER_META = {
  time: { label: 'Time', icon: CalendarIcon },
  morale: { label: 'Morale', icon: TeamIcon },
  stability: { label: 'Build Stability', icon: CommandIcon },
}

const DRAG_THRESHOLD = 6

// A single pointer-drag engine shared by task cards and crew tokens. Uses
// Pointer Events so mouse and touch behave the same, and a movement threshold
// so a tap (no drag) can be handled separately as a fallback.
//
// Performance: pointer coordinates live in a ref and are written straight to
// the drag-ghost element's transform inside a requestAnimationFrame callback,
// so continuous pointer movement never triggers a React re-render. Only the
// low-frequency drag metadata (which item, and whether the threshold was
// crossed) is kept in state, because that drives class names on the board.
function usePointerDrag(onDrop, onTap) {
  const [dragMeta, setDragMeta] = useState(null)
  const ghostRef = useRef(null)
  const stateRef = useRef(null)
  const rafRef = useRef(0)

  const paintGhost = useCallback(() => {
    rafRef.current = 0
    const s = stateRef.current
    const el = ghostRef.current
    if (s && el) {
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -140%)`
    }
  }, [])

  const start = useCallback(
    (kind, id, label) => (event) => {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      stateRef.current = {
        kind,
        id,
        label,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      }
      setDragMeta({ kind, id, label, moved: false })
    },
    [],
  )

  const move = useCallback(
    (event) => {
      const s = stateRef.current
      if (!s) return
      s.x = event.clientX
      s.y = event.clientY
      if (
        !s.moved &&
        Math.hypot(event.clientX - s.startX, event.clientY - s.startY) > DRAG_THRESHOLD
      ) {
        s.moved = true
        setDragMeta((m) => (m ? { ...m, moved: true } : m))
      }
      if (s.moved && !rafRef.current) {
        rafRef.current = requestAnimationFrame(paintGhost)
      }
    },
    [paintGhost],
  )

  const end = useCallback(
    (event) => {
      const s = stateRef.current
      const clientX = event.clientX
      const clientY = event.clientY
      stateRef.current = null
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      if (s) {
        if (s.moved) onDrop?.(s.kind, s.id, clientX, clientY)
        else onTap?.(s.kind, s.id)
      }
      setDragMeta(null)
    },
    [onDrop, onTap],
  )

  // Position the ghost before paint on the frame it first mounts so it never
  // flashes at the origin, then rAF keeps it under the pointer.
  useLayoutEffect(() => {
    if (dragMeta?.moved) paintGhost()
  }, [dragMeta?.moved, paintGhost])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return { dragMeta, ghostRef, start, move, end }
}

function initials(name) {
  return name.slice(0, 1).toUpperCase()
}

const MeterBar = memo(function MeterBar({ meterKey, value }) {
  const meta = METER_META[meterKey]
  const Icon = meta.icon
  const low = value < 30
  return (
    <div className={`studio-meter${low ? ' is-low' : ''}`} data-testid={`studio-meter-${meterKey}`}>
      <span className="studio-meter-head">
        <span className="studio-meter-icon" aria-hidden="true"><Icon size={13} /></span>
        <span className="studio-meter-label">{meta.label}</span>
        <span className="studio-meter-val">{value}</span>
      </span>
      <span className="studio-meter-track">
        <span className="studio-meter-fill" style={{ width: `${value}%` }} />
      </span>
    </div>
  )
})

// Self-contained deadline clock. It owns its own interval so the once-a-second
// tick re-renders only this small node instead of the whole landing tree. The
// countdown is purely cosmetic (no game logic reads it), so isolating it here
// is behavior-preserving.
const StudioCountdown = memo(function StudioCountdown({ className, testId }) {
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DEADLINE_SECONDS)
  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span className={className} data-testid={testId}>
      {formatCountdown(secondsLeft)}
    </span>
  )
})

export default function QuestLanding({ openLogin, openSignup }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [assignments, setAssignments] = useState({})
  const [rooms, setRooms] = useState([])
  const [openRoom, setOpenRoom] = useState(null)
  const [roomSel, setRoomSel] = useState({ docs: {}, campfire: {}, forge: {} })
  const [pickedCard, setPickedCard] = useState(null)
  const [roomTried, setRoomTried] = useState({})
  const [selectedMember, setSelectedMember] = useState(null)
  const [started, setStarted] = useState(false)
  const [shipped, setShipped] = useState(false)
  const boardRef = useRef(null)

  const meters = useMemo(
    () => computeMeters({ tasks, assignments, roomActions: rooms }),
    [tasks, assignments, rooms],
  )
  const xp = useMemo(() => studioXp({ tasks, roomActions: rooms }), [tasks, rooms])
  const level = levelForXp(xp)
  const done = tasksDone(tasks)
  const total = STUDIO_TASKS.length
  const allDone = done === total
  const progress = studioProgress(tasks)
  const result = useMemo(
    () => (shipped ? bossResult({ tasks, assignments, meters }) : null),
    [shipped, tasks, assignments, meters],
  )

  const columnOf = useCallback((taskId) => tasks.find((t) => t.id === taskId)?.col, [tasks])

  const moveTask = useCallback(
    (taskId, toCol) => {
      setShipped(false)
      setTasks((current) => {
        const task = current.find((t) => t.id === taskId)
        if (!task || !canMoveTask(task.col, toCol)) return current
        return current.map((t) => (t.id === taskId ? { ...t, col: toCol } : t))
      })
    },
    [],
  )

  const advanceTask = useCallback(
    (taskId) => {
      const from = columnOf(taskId)
      if (!from) return
      const to = nextColumnId(from)
      if (to !== from) moveTask(taskId, to)
    },
    [columnOf, moveTask],
  )

  const assign = useCallback((taskId, memberId) => {
    setShipped(false)
    setAssignments((current) => ({ ...current, [taskId]: memberId }))
    setSelectedMember(null)
  }, [])

  const clearAssign = useCallback((taskId) => {
    setAssignments((current) => {
      const next = { ...current }
      delete next[taskId]
      return next
    })
  }, [])

  const openRoomGame = useCallback((roomId) => {
    setPickedCard(null)
    setOpenRoom((current) => (current === roomId ? null : roomId))
  }, [])

  const chooseOption = useCallback((gameId, itemId, choiceId) => {
    setRoomSel((current) => ({
      ...current,
      [gameId]: { ...current[gameId], [itemId]: choiceId },
    }))
  }, [])

  const pickCard = useCallback((gameId, cardId) => {
    setPickedCard((current) =>
      current && current.gameId === gameId && current.cardId === cardId
        ? null
        : { gameId, cardId },
    )
  }, [])

  const placeCard = useCallback(
    (gameId, targetId) => {
      if (!pickedCard || pickedCard.gameId !== gameId) return
      const { cardId } = pickedCard
      setRoomSel((current) => ({
        ...current,
        [gameId]: { ...current[gameId], [cardId]: targetId },
      }))
      setPickedCard(null)
    },
    [pickedCard],
  )

  const unplaceCard = useCallback((gameId, cardId) => {
    setPickedCard(null)
    setRoomSel((current) => {
      const next = { ...current[gameId] }
      delete next[cardId]
      return { ...current, [gameId]: next }
    })
  }, [])

  const claimRoom = useCallback(
    (gameId) => {
      setShipped(false)
      if (roomGameSolved(gameId, roomSel[gameId])) {
        setRooms((current) => (current.includes(gameId) ? current : [...current, gameId]))
        setOpenRoom(null)
        setPickedCard(null)
        setRoomTried((current) => ({ ...current, [gameId]: false }))
      } else {
        setRoomTried((current) => ({ ...current, [gameId]: true }))
      }
    },
    [roomSel],
  )

  const handleDrop = useCallback(
    (kind, id, x, y) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return
      if (kind === 'task') {
        const colEl = el.closest('[data-col]')
        if (colEl) moveTask(id, colEl.getAttribute('data-col'))
      } else if (kind === 'member') {
        const taskEl = el.closest('[data-task-id]')
        if (taskEl) assign(taskEl.getAttribute('data-task-id'), id)
      }
    },
    [moveTask, assign],
  )

  const handleTap = useCallback((kind, id) => {
    if (kind === 'member') {
      setSelectedMember((current) => (current === id ? null : id))
    }
  }, [])

  const { dragMeta, ghostRef, start, move, end } = usePointerDrag(handleDrop, handleTap)

  const startJam = () => {
    setStarted(true)
    boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const resetJam = () => {
    setTasks(initialTasks())
    setAssignments({})
    setRooms([])
    setOpenRoom(null)
    setRoomSel({ docs: {}, campfire: {}, forge: {} })
    setPickedCard(null)
    setRoomTried({})
    setSelectedMember(null)
    setShipped(false)
  }

  const danteLine = result
    ? result.message
    : !started
      ? 'Welcome to the studio. Drag the jam tasks across the board, assign the right crew, and beat the Deadline Boss.'
      : selectedMember
        ? `You picked up ${getMember(selectedMember)?.name}. Tap a task to put them on it, or drag them over.`
        : allDone
          ? 'The board is clear. Head to the ship desk and submit before the clock runs out.'
          : 'Match each task to the crew member whose role fits. Good matches keep morale and stability high.'

  return (
    <div className="studio-page">
      <header className="quest-nav">
        <a className="quest-brand" href="#studio-top" aria-label="Inferno home">
          <InfernoLogo size={30} />
          <span className="quest-brand-word">Inferno</span>
        </a>
        <div className="quest-nav-actions">
          <button type="button" className="quest-ghost-btn" onClick={openLogin}>
            Log in
          </button>
          <button type="button" className="quest-primary-btn quest-nav-cta" onClick={openSignup}>
            Sign up
          </button>
        </div>
      </header>

      {/* HUD: strategy meters, XP, deadline */}
      <div className="studio-hud" id="studio-top" data-testid="studio-hud">
        <div className="studio-hud-meters">
          {['time', 'morale', 'stability'].map((key) => (
            <MeterBar key={key} meterKey={key} value={meters[key]} />
          ))}
        </div>
        <div className="studio-hud-side">
          <div className="studio-hud-xp">
            <div className="studio-hud-xp-top">
              <span className="quest-hud-key">XP</span>
              <span className="quest-hud-val">{xp} / {MAX_XP}</span>
              <span className="quest-hud-lvl">LVL {level}</span>
            </div>
            <div className="quest-xp-bar" role="progressbar" aria-valuenow={xpIntoLevel(xp)} aria-valuemin={0} aria-valuemax={XP_PER_LEVEL}>
              <span style={{ width: `${(xpIntoLevel(xp) / XP_PER_LEVEL) * 100}%` }} />
            </div>
          </div>
          <div className="studio-hud-timer">
            <span className="quest-hud-key">Deadline</span>
            <StudioCountdown className="quest-hud-clock" testId="studio-clock" />
          </div>
        </div>
      </div>

      {/* Intro */}
      <section className="studio-intro">
        <div className="studio-intro-copy">
          <p className="quest-eyebrow">Game Jam Studio Simulator</p>
          <h1 className="quest-title">Run Dante's jam studio</h1>
          <p className="quest-subtitle">
            This is not a tour. Move the work, staff your crew, and manage the meters to beat the
            deadline. It is Inferno, played.
          </p>
          <div className="quest-cta-row">
            <button type="button" className="quest-primary-btn quest-start-btn" onClick={startJam}>
              {started ? 'Back to the board' : 'Start the Jam'}
            </button>
            <button type="button" className="quest-ghost-btn" onClick={openLogin}>
              Enter Dashboard
            </button>
          </div>
          <p className="studio-demo-note">
            This is a free playable demo. Your own boards, projects, tasks, and team start once you
            sign up and log in.
          </p>
        </div>
        <div className="quest-dante">
          <span className="quest-dante-avatar"><InfernoLogo size={44} /></span>
          <div>
            <p className="quest-dante-name">Dante, studio lead</p>
            <p className="quest-dante-line">{danteLine}</p>
          </div>
        </div>
      </section>

      {/* Studio scene */}
      <section className="studio-scene" ref={boardRef}>
        {/* Board workstation */}
        <div className="studio-station studio-board-station" data-testid="studio-board">
          <div className="studio-station-head">
            <span className="studio-station-icon" aria-hidden="true"><BoardIcon size={16} /></span>
            <h2 className="studio-station-title">Quest Board</h2>
            <span className="studio-station-meta">{done} / {total} shipped</span>
          </div>
          <div className="studio-board-track" aria-hidden="true">
            <span className="studio-board-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="studio-columns">
            {BOARD_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.col === col.id)
              const isTarget = dragMeta?.kind === 'task' && dragMeta.moved
              return (
                <div
                  key={col.id}
                  className={`studio-column${isTarget ? ' is-droppable' : ''}`}
                  data-col={col.id}
                  data-testid={`studio-column-${col.id}`}
                >
                  <p className="studio-column-title">{col.label}<span>{colTasks.length}</span></p>
                  <ul className="studio-card-list">
                    {colTasks.map((task) => {
                      const meta = getStudioTask(task.id)
                      const memberId = assignments[task.id]
                      const member = getMember(memberId)
                      const quality = assignmentQuality(meta, member)
                      const dragging = dragMeta?.kind === 'task' && dragMeta.id === task.id
                      const canAssignHere = Boolean(selectedMember)
                      return (
                        <li
                          key={task.id}
                          className={`studio-card${dragging ? ' is-dragging' : ''}${canAssignHere ? ' is-assignable' : ''}`}
                          data-task-id={task.id}
                          onPointerDown={start('task', task.id, meta?.title)}
                          onPointerMove={move}
                          onPointerUp={end}
                          onClick={() => {
                            if (selectedMember) assign(task.id, selectedMember)
                          }}
                        >
                          <div className="studio-card-top">
                            <span className={`studio-card-role role-${meta.role}`}>{ROLES[meta.role]}</span>
                            <span className="studio-card-xp">+{meta.xp}</span>
                          </div>
                          <p className="studio-card-title">{meta.title}</p>
                          <div className="studio-card-foot">
                            <button
                              type="button"
                              className={`studio-assign-slot quality-${quality}`}
                              data-testid={`studio-assign-${task.id}`}
                              aria-label={member ? `Assigned to ${member.name}. Change or clear.` : 'Assign a crew member'}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (selectedMember) assign(task.id, selectedMember)
                                else if (member) clearAssign(task.id)
                              }}
                            >
                              {member ? (
                                <>
                                  <span className={`studio-token-avatar role-${member.role}`}>{initials(member.name)}</span>
                                  <span className="studio-assign-name">{member.name}</span>
                                  {quality === 'match' ? <span className="studio-quality-tag is-good"><CheckIcon size={11} /></span> : null}
                                  {quality === 'mismatch' ? <span className="studio-quality-tag is-bad"><CloseIcon size={11} /></span> : null}
                                </>
                              ) : (
                                <span className="studio-assign-empty">Assign crew</span>
                              )}
                            </button>
                            {col.id !== 'done' ? (
                              <button
                                type="button"
                                className="studio-advance-btn"
                                data-testid={`studio-advance-${task.id}`}
                                aria-label={`Move ${meta.title} to the next column`}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  advanceTask(task.id)
                                }}
                              >
                                Advance
                              </button>
                            ) : (
                              <span className="studio-card-shipped"><CheckIcon size={12} /> Shipped</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                    {colTasks.length === 0 ? <li className="studio-column-empty">Drop here</li> : null}
                  </ul>
                </div>
              )
            })}
          </div>
          <p className="studio-hint">Drag a card between columns, or use Advance. Assign crew by dragging a token onto a task or tapping to place it.</p>
        </div>

        {/* Crew + rooms sidebar */}
        <div className="studio-side">
          <div className="studio-station studio-crew-station" data-testid="studio-crew">
            <div className="studio-station-head">
              <span className="studio-station-icon" aria-hidden="true"><TeamIcon size={16} /></span>
              <h2 className="studio-station-title">Crew</h2>
            </div>
            <p className="studio-crew-hint">
              {selectedMember ? 'Now tap a task to assign, or tap the token again to drop it.' : 'Drag a token onto a task, or tap to pick one up.'}
            </p>
            <ul className="studio-token-row">
              {TEAM.map((member) => {
                const active = selectedMember === member.id
                const dragging = dragMeta?.kind === 'member' && dragMeta.id === member.id
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      className={`studio-token role-${member.role}${active ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
                      data-testid={`studio-token-${member.id}`}
                      aria-pressed={active}
                      onPointerDown={start('member', member.id, member.name)}
                      onPointerMove={move}
                      onPointerUp={end}
                    >
                      <span className={`studio-token-avatar role-${member.role}`}>{initials(member.name)}</span>
                      <span className="studio-token-body">
                        <span className="studio-token-name">{member.name}</span>
                        <span className="studio-token-role">{ROLES[member.role]}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="studio-station studio-rooms-station" data-testid="studio-rooms">
            <div className="studio-station-head">
              <span className="studio-station-icon" aria-hidden="true"><FlameIcon size={16} /></span>
              <h2 className="studio-station-title">Studio rooms</h2>
            </div>
            <p className="studio-crew-hint">Each room is a quick puzzle. Solve it to boost your meters.</p>
            <ul className="studio-room-row">
              {ROOM_ACTIONS.map((action) => {
                const Icon = ROOM_ICONS[action.icon] || FlameIcon
                const game = getRoomGame(action.id)
                const done = rooms.includes(action.id)
                const isOpen = openRoom === action.id
                const sel = roomSel[action.id] || {}
                const score = roomGameScore(action.id, sel)
                return (
                  <li key={action.id} className={`studio-room-item${isOpen ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className={`studio-room${done ? ' is-used' : ''}`}
                      data-testid={`studio-room-${action.id}`}
                      disabled={done}
                      aria-expanded={isOpen}
                      onClick={() => openRoomGame(action.id)}
                    >
                      <span className="studio-room-icon" aria-hidden="true"><Icon size={16} /></span>
                      <span className="studio-room-body">
                        <span className="studio-room-name">{action.label}</span>
                        <span className="studio-room-hint">{done ? 'Solved' : action.hint}</span>
                      </span>
                      {done ? (
                        <span className="studio-room-check"><CheckIcon size={13} /></span>
                      ) : (
                        <span className="studio-room-xp">{isOpen ? 'Close' : `+${action.xp}`}</span>
                      )}
                    </button>

                    {isOpen && !done && game ? (
                      <div className="studio-minigame" data-testid={`studio-minigame-${action.id}`}>
                        <p className="studio-minigame-title">{game.title}</p>
                        <p className="studio-minigame-hint">{game.hint}</p>

                        {game.kind === 'select' ? (
                          <ul className="studio-doc-rows">
                            {game.items.map((row) => (
                              <li key={row.id} className="studio-doc-row">
                                <span className="studio-doc-label">{row.label}</span>
                                <div className="studio-doc-options">
                                  {row.options.map((opt) => {
                                    const picked = sel[row.id] === opt.id
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        className={`studio-doc-option${picked ? ' is-picked' : ''}`}
                                        aria-pressed={picked}
                                        data-testid={`studio-doc-${row.id}-${opt.id}`}
                                        onClick={() => chooseOption(action.id, row.id, opt.id)}
                                      >
                                        {opt.text}
                                      </button>
                                    )
                                  })}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="studio-match">
                            <ul className="studio-match-tray" aria-label="Cards to route">
                              {game.items.filter((card) => !sel[card.id]).length === 0 ? (
                                <li className="studio-match-empty">All routed. Confirm below.</li>
                              ) : (
                                game.items
                                  .filter((card) => !sel[card.id])
                                  .map((card) => {
                                    const held =
                                      pickedCard &&
                                      pickedCard.gameId === action.id &&
                                      pickedCard.cardId === card.id
                                    return (
                                      <li key={card.id}>
                                        <button
                                          type="button"
                                          className={`studio-msg-card${held ? ' is-picked' : ''}`}
                                          aria-pressed={held}
                                          data-testid={`studio-card-${card.id}`}
                                          onClick={() => pickCard(action.id, card.id)}
                                        >
                                          {card.text}
                                        </button>
                                      </li>
                                    )
                                  })
                              )}
                            </ul>
                            <ul className="studio-match-targets">
                              {game.targets.map((target) => {
                                const here = game.items.filter((card) => sel[card.id] === target.id)
                                const armed = Boolean(pickedCard && pickedCard.gameId === action.id)
                                return (
                                  <li key={target.id} className="studio-match-target">
                                    <button
                                      type="button"
                                      className={`studio-target-zone${armed ? ' is-armed' : ''}`}
                                      disabled={!armed}
                                      data-testid={`studio-target-${target.id}`}
                                      onClick={() => placeCard(action.id, target.id)}
                                    >
                                      <span className="studio-target-label">{target.label}</span>
                                      {armed ? <span className="studio-target-hint">Place here</span> : null}
                                    </button>
                                    <ul className="studio-target-cards">
                                      {here.map((card) => (
                                        <li key={card.id}>
                                          <button
                                            type="button"
                                            className="studio-placed-card"
                                            aria-label={`Move ${card.text} back to the tray`}
                                            onClick={() => unplaceCard(action.id, card.id)}
                                          >
                                            {card.text}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="studio-minigame-foot">
                          <span className="studio-minigame-score">{score.correct} / {score.total} right</span>
                          <button
                            type="button"
                            className="quest-primary-btn studio-minigame-claim"
                            data-testid={`studio-claim-${action.id}`}
                            disabled={!score.complete}
                            onClick={() => claimRoom(action.id)}
                          >
                            {game.action}
                          </button>
                        </div>
                        {roomTried[action.id] && !score.solved ? (
                          <p className="studio-minigame-retry">Not quite. Adjust your picks and try again.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Ship desk / Deadline Boss */}
        <div className="studio-station studio-ship-station" data-testid="studio-ship">
          <div className="studio-station-head">
            <span className="studio-station-icon" aria-hidden="true"><TrophyIcon size={16} /></span>
            <h2 className="studio-station-title">Deadline Boss</h2>
            <StudioCountdown className="studio-station-meta" testId="studio-ship-clock" />
          </div>
          {result ? (
            <div className={`studio-result is-${result.tier}`} role="status" data-testid="studio-result">
              <span className="studio-result-badge"><TrophyIcon size={24} /></span>
              <p className="studio-result-title">{result.title}</p>
              <p className="studio-result-copy">{result.message}</p>
              <ul className="studio-result-stats">
                <li><span>Tasks</span><strong>{result.done}/{result.total}</strong></li>
                <li><span>Good matches</span><strong>{result.matches}</strong></li>
                <li><span>Score</span><strong>{result.score}</strong></li>
              </ul>
              <div className="quest-cta-row">
                {result.win ? (
                  <button type="button" className="quest-primary-btn" onClick={openSignup}>{result.cta}</button>
                ) : (
                  <button type="button" className="quest-primary-btn" onClick={resetJam}>{result.cta}</button>
                )}
                <button type="button" className="quest-ghost-btn" onClick={openSignup}>
                  {result.win ? 'Enter Dashboard' : 'Skip to signup'}
                </button>
              </div>
            </div>
          ) : (
            <div className="studio-ship-ready">
              <p className="studio-ship-copy">
                {allDone
                  ? 'Every task shipped. Submit the build and face the Deadline Boss.'
                  : `${total - done} task${total - done === 1 ? '' : 's'} left in the board. You can ship now, but unfinished work weakens your result.`}
              </p>
              <button
                type="button"
                className="quest-primary-btn studio-ship-btn"
                data-testid="studio-ship-btn"
                onClick={() => setShipped(true)}
              >
                Submit the build
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="quest-footer">
        <span>Inferno</span>
        <span className="quest-footer-muted">Plan, staff, and ship games with your crew.</span>
        <nav className="quest-footer-links" aria-label="Legal and support">
          <a href="/terms.html">Terms</a>
          <a href="/privacy.html">Privacy</a>
          <a href="mailto:celeste@infernotaskboard.com">Support</a>
        </nav>
        <button type="button" className="studio-footer-cta" onClick={openSignup}>
          Start your real studio board
        </button>
        <span className="quest-footer-copy">&copy; 2026 Rousell Technologies LLC</span>
      </footer>

      {dragMeta && dragMeta.moved ? (
        <div ref={ghostRef} className="studio-drag-ghost" aria-hidden="true">
          {dragMeta.label}
        </div>
      ) : null}
    </div>
  )
}
