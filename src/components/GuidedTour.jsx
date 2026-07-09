import { useMemo, useState } from 'react'
import FlameHorse from './FlameHorse'

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'building', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

const DISCIPLINES = ['Design', 'Art', 'Code', 'Audio', 'Polish']

const ROSTER_SUGGESTIONS = ['Pixel', 'Nova', 'Riff', 'Sage']

const BOARD_SUGGESTION = 'Game Jam Stable'
const PROJECT_SUGGESTION = 'Emberhold'
const TASK_SUGGESTIONS = [
  { title: 'Main Menu', discipline: 'Design' },
  { title: 'Core Movement', discipline: 'Code' },
  { title: 'Soundtrack Loop', discipline: 'Audio' },
  { title: 'Boss Polish', discipline: 'Polish' },
]

const STEPS = [
  {
    id: 'board',
    title: 'Name your studio board',
    hint: 'Every jam needs a home base. Give your board a name so the crew knows where to gather.',
    objective: 'Name the board to light the forge.',
    done: (s) => s.boardName.trim().length > 0,
  },
  {
    id: 'project',
    title: 'Open a project',
    hint: 'Projects group the work, whether that is a vertical slice, a boss fight, or the whole game.',
    objective: 'Add a project to the board.',
    done: (s) => s.project.trim().length > 0,
  },
  {
    id: 'task',
    title: 'Create your first task',
    hint: 'Break the dream into cards. Pick a discipline so producers can read the pipeline at a glance. Tap a quest suggestion to add it fast.',
    objective: 'Add at least one task to To Do.',
    done: (s) => s.tasks.length > 0,
  },
  {
    id: 'move',
    title: 'Move a card into In Progress',
    hint: 'Work flows left to right. Tap a To Do card to pull it into In Progress and start the sprint.',
    objective: 'Advance a card into In Progress.',
    done: (s) => s.tasks.some((t) => t.status === 'building' || t.status === 'done'),
  },
  {
    id: 'assign',
    title: 'Assign the work',
    hint: 'No hero solos a game jam. Put a name on a card so everyone owns their slice.',
    objective: 'Assign a teammate to any card.',
    done: (s) => s.tasks.some((t) => t.assignee),
  },
  {
    id: 'invite',
    title: 'Invite a teammate',
    hint: 'Grow the party. Invites are how sprite artists, sound folks, and coders join the board.',
    objective: 'Invite one teammate to the roster.',
    done: (s) => s.roster.length > 0,
  },
  {
    id: 'insights',
    title: 'Peek at calendar and reports',
    hint: 'Check due dates and production health before the build deadline sneaks up on you.',
    objective: 'Open the insights peek.',
    done: (s) => s.peeked,
  },
  {
    id: 'ship',
    title: 'Ship the jam build',
    hint: 'Push a card all the way to Done. That final polish pass is the boss fight of every jam.',
    objective: 'Move a card to Done.',
    done: (s) => s.tasks.some((t) => t.status === 'done'),
  },
]

let nextId = 200

const INITIAL = {
  boardName: '',
  project: '',
  tasks: [],
  roster: [],
  peeked: false,
}

export default function GuidedTour({ openSignup }) {
  const [state, setState] = useState(INITIAL)
  const [boardDraft, setBoardDraft] = useState('')
  const [projectDraft, setProjectDraft] = useState('')
  const [taskDraft, setTaskDraft] = useState('')
  const [discipline, setDiscipline] = useState('Design')
  const [inviteDraft, setInviteDraft] = useState('')

  const completed = useMemo(() => STEPS.map((step) => step.done(state)), [state])
  const completedCount = completed.filter(Boolean).length
  const activeIndex = completed.findIndex((value) => !value)
  const finished = activeIndex === -1
  const activeStep = finished ? null : STEPS[activeIndex]

  const grouped = useMemo(() => {
    const map = { todo: [], building: [], done: [] }
    for (const task of state.tasks) map[task.status]?.push(task)
    return map
  }, [state.tasks])

  const setBoardName = (event) => {
    event.preventDefault()
    const name = boardDraft.trim()
    if (!name) return
    setState((s) => ({ ...s, boardName: name }))
  }

  const addProject = (event) => {
    event.preventDefault()
    const name = projectDraft.trim()
    if (!name) return
    setState((s) => ({ ...s, project: name }))
    setProjectDraft('')
  }

  const addTask = (event) => {
    event.preventDefault()
    const title = taskDraft.trim()
    if (!title) return
    setState((s) => ({
      ...s,
      tasks: [...s.tasks, { id: `t${(nextId += 1)}`, title, discipline, status: 'todo', assignee: '' }],
    }))
    setTaskDraft('')
  }

  const addSuggestedTask = (suggestion) => {
    setState((s) =>
      s.tasks.some((t) => t.title === suggestion.title)
        ? s
        : {
            ...s,
            tasks: [
              ...s.tasks,
              { id: `t${(nextId += 1)}`, title: suggestion.title, discipline: suggestion.discipline, status: 'todo', assignee: '' },
            ],
          },
    )
  }

  const advance = (task) => {
    const order = COLUMNS.map((column) => column.id)
    const current = order.indexOf(task.status)
    const next = order[Math.min(current + 1, order.length - 1)]
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((item) => (item.id === task.id ? { ...item, status: next } : item)),
    }))
  }

  const assign = (taskId, name) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((item) => (item.id === taskId ? { ...item, assignee: name } : item)),
    }))
  }

  const invite = (event) => {
    event.preventDefault()
    const name = inviteDraft.trim()
    if (!name) return
    setState((s) => (s.roster.includes(name) ? s : { ...s, roster: [...s.roster, name] }))
    setInviteDraft('')
  }

  const togglePeek = () => setState((s) => ({ ...s, peeked: !s.peeked }))

  const reset = () => {
    setState(INITIAL)
    setBoardDraft('')
    setProjectDraft('')
    setTaskDraft('')
    setDiscipline('Design')
    setInviteDraft('')
  }

  const assignableRoster = state.roster.length > 0 ? state.roster : ROSTER_SUGGESTIONS

  const total = STEPS.length
  const pct = Math.round((completedCount / total) * 100)
  const level = Math.min(completedCount + 1, total)
  const assignedCount = state.tasks.filter((task) => task.assignee).length
  const spirit = state.tasks.length ? Math.round((assignedCount / state.tasks.length) * 100) : 0
  const studioName = state.boardName || 'New Studio'
  const crest = (state.boardName || 'GJ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'GJ'
  const disciplinesOnBoard = [...new Set(state.tasks.map((task) => task.discipline))]
  const partyMembers = ['Dante', ...state.roster]
  const stats = [
    { label: 'Tasks', value: state.tasks.length },
    { label: 'In Progress', value: grouped.building.length },
    { label: 'Shipped', value: grouped.done.length },
    { label: 'Crew', value: state.roster.length },
  ]

  return (
    <div className="tour tour-rpg" data-testid="guided-tour">
      <div className="tour-hud">
        <p className="tour-hud-title">
          <span className="tour-hud-badge" aria-hidden="true">&#9876;</span>
          Game Jam Quest
        </p>
        <div className="tour-hud-track">
          <ol className="tour-pips" aria-hidden="true">
            {STEPS.map((step, index) => (
              <li
                key={step.id}
                className={
                  completed[index] ? 'tour-pip is-done' : index === activeIndex ? 'tour-pip is-active' : 'tour-pip'
                }
              />
            ))}
          </ol>
          <div
            className="tour-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completedCount}
            aria-label="Quest progress"
          >
            <span className="tour-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="tour-hud-count">{completedCount}/{total}</span>
        </div>
        <button type="button" className="tour-reset" onClick={reset} data-testid="tour-reset">
          Restart
        </button>
      </div>

      <p className="tour-progress-text tour-visually-hidden" aria-live="polite" data-testid="tour-progress-text">
        {completedCount} of {total} steps complete
        {!finished ? `. Next up: ${activeStep.objective}` : '. Nice run.'}
      </p>

      <div className="tour-stage">
        <aside className="tour-panel tour-hero-panel" aria-label="Studio stats">
          <div className="tour-hero-top">
            <span className="tour-crest" aria-hidden="true">{crest}</span>
            <span className="tour-hero-id">
              <span className="tour-hero-name">{studioName}</span>
              <span className="tour-hero-lvl">Lv. {level}</span>
            </span>
          </div>

          <div className="tour-xp">
            <div className="tour-xp-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
            <span className="tour-xp-text">{completedCount} / {total} XP</span>
          </div>

          <ul className="tour-stats">
            {stats.map((stat) => (
              <li key={stat.label}>
                <span className="tour-stat-icon" aria-hidden="true" />
                <span className="tour-stat-label">{stat.label}</span>
                <span className="tour-stat-value">{stat.value}</span>
              </li>
            ))}
          </ul>

          <div className="tour-inventory">
            <span className="tour-panel-eyebrow">Inventory</span>
            <div className="tour-inventory-items">
              {disciplinesOnBoard.length === 0 ? (
                <span className="tour-inventory-empty">Empty pack</span>
              ) : (
                disciplinesOnBoard.map((item) => (
                  <span key={item} className={`tour-tag tour-tag--${item.toLowerCase()}`}>{item}</span>
                ))
              )}
            </div>
          </div>

          <div className="tour-questlog">
            <span className="tour-panel-eyebrow">Quest log</span>
            <ol className="tour-checklist">
              {STEPS.map((step, index) => (
                <li
                  key={step.id}
                  className={
                    completed[index]
                      ? 'tour-check is-done'
                      : index === activeIndex
                        ? 'tour-check is-active'
                        : 'tour-check'
                  }
                >
                  <span className="tour-check-mark" aria-hidden="true" />
                  <span>{step.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="tour-panel tour-quest-panel">
          <div className="tour-quest-head">
            <span className="tour-panel-eyebrow">Current quest</span>
            <h3 className="tour-quest-title">
              {finished ? 'Quest complete: the jam build shipped' : activeStep.title}
            </h3>
            <p className="tour-quest-obj">
              <span className="tour-quest-obj-flag" aria-hidden="true">&#9873;</span>
              {finished ? 'You ran the whole Inferno loop.' : activeStep.objective}
            </p>
          </div>

          <div className="tour-dante" data-testid="tour-dante">
            <span className="tour-dante-portrait" aria-hidden="true">
              <FlameHorse size={44} />
            </span>
            <div className="tour-dante-copy">
              <span className="tour-dante-name">
                Dante <span className="tour-dante-role">your guide</span>
              </span>
              <p className="tour-dante-line">
                {finished
                  ? 'A worthy run, hero. That is the whole Inferno loop. Sign up and light this for real.'
                  : activeStep.hint}
              </p>
            </div>
          </div>

          <div className="tour-actions">
            <form className="tour-field" onSubmit={setBoardName}>
              <label htmlFor="tour-board">Board name</label>
              <div className="tour-field-row">
                <input
                  id="tour-board"
                  className="tour-input"
                  value={boardDraft}
                  onChange={(event) => setBoardDraft(event.target.value)}
                  placeholder={`e.g. ${BOARD_SUGGESTION}`}
                  maxLength={40}
                  data-testid="tour-board-input"
                />
                <button type="submit" className="tour-btn tour-btn--ghost" data-testid="tour-board-save">
                  {state.boardName ? 'Rename' : 'Create'}
                </button>
              </div>
              {!state.boardName ? (
                <button
                  type="button"
                  className="tour-chip"
                  onClick={() => setBoardDraft(BOARD_SUGGESTION)}
                  data-testid="tour-board-suggestion"
                >
                  Try: {BOARD_SUGGESTION}
                </button>
              ) : null}
            </form>

            <form className="tour-field" onSubmit={addProject}>
              <label htmlFor="tour-project">Project</label>
              <div className="tour-field-row">
                <input
                  id="tour-project"
                  className="tour-input"
                  value={projectDraft}
                  onChange={(event) => setProjectDraft(event.target.value)}
                  placeholder={`e.g. ${PROJECT_SUGGESTION}`}
                  maxLength={40}
                  data-testid="tour-project-input"
                />
                <button type="submit" className="tour-btn tour-btn--ghost" data-testid="tour-project-add">
                  Add
                </button>
              </div>
              {!state.project ? (
                <button
                  type="button"
                  className="tour-chip"
                  onClick={() => setProjectDraft(PROJECT_SUGGESTION)}
                  data-testid="tour-project-suggestion"
                >
                  Try: {PROJECT_SUGGESTION}
                </button>
              ) : null}
            </form>

            <form className="tour-field" onSubmit={addTask}>
              <label htmlFor="tour-task">New task</label>
              <div className="tour-field-row">
                <input
                  id="tour-task"
                  className="tour-input"
                  value={taskDraft}
                  onChange={(event) => setTaskDraft(event.target.value)}
                  placeholder="e.g. Sprite pass on the hero"
                  maxLength={60}
                  data-testid="tour-task-input"
                />
                <select
                  className="tour-select"
                  value={discipline}
                  onChange={(event) => setDiscipline(event.target.value)}
                  aria-label="Task discipline"
                  data-testid="tour-task-discipline"
                >
                  {DISCIPLINES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <button type="submit" className="tour-btn tour-btn--ember" data-testid="tour-task-add">
                  Add task
                </button>
              </div>
              <div className="tour-suggestions" aria-label="Quest task suggestions">
                {TASK_SUGGESTIONS.map((suggestion) => {
                  const added = state.tasks.some((task) => task.title === suggestion.title)
                  return (
                    <button
                      key={suggestion.title}
                      type="button"
                      className="tour-chip"
                      onClick={() => addSuggestedTask(suggestion)}
                      disabled={added}
                      data-testid="tour-task-suggestion"
                    >
                      {added ? '✓ ' : '+ '}{suggestion.title}
                    </button>
                  )
                })}
              </div>
            </form>

            <div className="tour-actions-row">
              <form className="tour-field" onSubmit={invite}>
                <label htmlFor="tour-invite">Rally the party</label>
                <div className="tour-field-row">
                  <input
                    id="tour-invite"
                    className="tour-input"
                    value={inviteDraft}
                    onChange={(event) => setInviteDraft(event.target.value)}
                    placeholder="e.g. Pixel"
                    maxLength={30}
                    data-testid="tour-invite-input"
                  />
                  <button type="submit" className="tour-btn tour-btn--ghost" data-testid="tour-invite-add">
                    Invite
                  </button>
                </div>
              </form>

              <div className="tour-field">
                <span className="tour-field-label">Scout ahead</span>
                <button
                  type="button"
                  className="tour-btn tour-btn--ghost tour-peek-btn"
                  onClick={togglePeek}
                  aria-expanded={state.peeked}
                  data-testid="tour-peek"
                >
                  {state.peeked ? 'Hide calendar and reports' : 'Peek at calendar and reports'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="tour-panel tour-board-panel">
          <div className="tour-board-bar">
            <span className="tour-panel-eyebrow">Your board preview</span>
            <span className="tour-board-name">{state.boardName || 'Untitled board'}</span>
            {state.project ? <span className="tour-board-project">{state.project}</span> : null}
          </div>

          {state.peeked ? (
            <div className="tour-insights" data-testid="tour-insights">
              <div className="tour-insight-card">
                <span className="tour-insight-label">Calendar</span>
                <strong>{state.tasks.length} card{state.tasks.length === 1 ? '' : 's'} with due dates</strong>
              </div>
              <div className="tour-insight-card">
                <span className="tour-insight-label">In progress</span>
                <strong>{grouped.building.length}</strong>
              </div>
              <div className="tour-insight-card">
                <span className="tour-insight-label">Done</span>
                <strong>{grouped.done.length}</strong>
              </div>
            </div>
          ) : null}

          <div className="tour-board">
            {COLUMNS.map((column) => (
              <section
                key={column.id}
                className={`tour-column tour-column--${column.id}`}
                aria-label={`${column.label} column`}
              >
                <header className="tour-column-head">
                  <h4>{column.label}</h4>
                  <span className="tour-count">{grouped[column.id].length}</span>
                </header>

                <ul className="tour-cards">
                  {grouped[column.id].length === 0 ? (
                    <li className="tour-empty">No cards yet</li>
                  ) : (
                    grouped[column.id].map((task) => (
                      <li key={task.id} className="tour-card">
                        <button
                          type="button"
                          className="tour-card-main"
                          onClick={() => advance(task)}
                          title={task.status === 'done' ? 'Done' : 'Move to next column'}
                          disabled={task.status === 'done'}
                          data-testid="tour-card-advance"
                        >
                          <span className={`tour-tag tour-tag--${task.discipline.toLowerCase()}`}>
                            {task.discipline}
                          </span>
                          <span className="tour-card-title">{task.title}</span>
                          <span className="tour-card-move" aria-hidden="true">
                            {task.status === 'done' ? '✓' : '→'}
                          </span>
                        </button>
                        <label className="tour-card-assign">
                          <span className="tour-visually-hidden">Assign {task.title}</span>
                          <select
                            value={task.assignee}
                            onChange={(event) => assign(task.id, event.target.value)}
                            data-testid="tour-card-assignee"
                          >
                            <option value="">Unassigned</option>
                            {assignableRoster.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="tour-teambar">
        <div className="tour-spirit">
          <span className="tour-spirit-label">
            <span className="tour-spirit-flame" aria-hidden="true">&#128293;</span>
            Team spirit
          </span>
          <div
            className="tour-progress tour-spirit-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={spirit}
            aria-label="Team spirit"
          >
            <span className="tour-progress-fill" style={{ width: `${spirit}%` }} />
          </div>
          <span className="tour-spirit-pct">{spirit}%</span>
        </div>
        <div className="tour-party" data-testid="tour-roster">
          <ul className="tour-avatars" aria-hidden="true">
            {partyMembers.slice(0, 5).map((member) => (
              <li key={member} className="tour-avatar-chip">{member.slice(0, 1).toUpperCase()}</li>
            ))}
          </ul>
          <span className="tour-party-label">
            {partyMembers.length} online{state.roster.length > 0 ? `: Dante, ${state.roster.join(', ')}` : ' (just Dante for now)'}
          </span>
        </div>
      </div>

      {finished ? (
        <div className="tour-win" role="status" data-testid="tour-win">
          <span className="tour-win-spark" aria-hidden="true">
            <FlameHorse size={44} />
          </span>
          <div className="tour-win-copy">
            <p>Jam build shipped. That is a full lap around Inferno, from empty board to final polish.</p>
            {openSignup ? (
              <button
                type="button"
                className="tour-btn tour-btn--ember tour-win-cta"
                onClick={openSignup}
                data-testid="tour-win-signup"
              >
                Sign up free and do it for real
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="tour-note muted-copy">Runs entirely in your browser. Nothing here is saved.</p>
    </div>
  )
}
