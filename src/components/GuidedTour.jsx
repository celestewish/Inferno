import { useMemo, useState } from 'react'
import FlameHorse from './FlameHorse'

const COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'building', label: 'In Progress' },
  { id: 'shipped', label: 'Shipped' },
]

const DISCIPLINES = ['Design', 'Art', 'Code', 'Audio', 'Polish']

const ROSTER_SUGGESTIONS = ['Pixel', 'Nova', 'Riff', 'Sage']

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
    hint: 'Break the dream into cards. Pick a discipline so producers can read the pipeline at a glance.',
    objective: 'Add at least one task to the Backlog.',
    done: (s) => s.tasks.length > 0,
  },
  {
    id: 'move',
    title: 'Move a card into In Progress',
    hint: 'Work flows left to right. Tap a Backlog card to pull it into In Progress and start the sprint.',
    objective: 'Advance a card into In Progress.',
    done: (s) => s.tasks.some((t) => t.status === 'building' || t.status === 'shipped'),
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
    title: 'Ship a milestone',
    hint: 'Push a card all the way to Shipped. That final polish pass is the boss fight of every jam.',
    objective: 'Move a card to Shipped.',
    done: (s) => s.tasks.some((t) => t.status === 'shipped'),
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

export default function GuidedTour() {
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
    const map = { backlog: [], building: [], shipped: [] }
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
      tasks: [...s.tasks, { id: `t${(nextId += 1)}`, title, discipline, status: 'backlog', assignee: '' }],
    }))
    setTaskDraft('')
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

  return (
    <div className="tour" data-testid="guided-tour">
      <div className="tour-quest" aria-label="Tutorial quest">
        <div className="tour-quest-head">
          <span className="tour-mascot" aria-hidden="true">
            <FlameHorse size={52} />
          </span>
          <div className="tour-quest-copy">
            <p className="tour-quest-kicker">Blaze the flame pony, your production buddy</p>
            {finished ? (
              <h3 className="tour-quest-title">Build shipped. You ran the whole pipeline.</h3>
            ) : (
              <h3 className="tour-quest-title">
                Quest {activeIndex + 1} of {STEPS.length}: {activeStep.title}
              </h3>
            )}
            <p className="tour-quest-hint">
              {finished
                ? 'That is the core Inferno loop: board, project, tasks, pipeline, team, insights, ship. Sign up to do it for real.'
                : activeStep.hint}
            </p>
          </div>
        </div>

        <div
          className="tour-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-valuenow={completedCount}
          aria-label="Tutorial progress"
        >
          <span className="tour-progress-fill" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
        </div>
        <p className="tour-progress-text" aria-live="polite" data-testid="tour-progress-text">
          {completedCount} of {STEPS.length} steps complete
          {!finished ? `. Next up: ${activeStep.objective}` : '. Nice run.'}
        </p>

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

      <div className="tour-stage">
        <div className="tour-controls">
          <form className="tour-field" onSubmit={setBoardName}>
            <label htmlFor="tour-board">Board name</label>
            <div className="tour-field-row">
              <input
                id="tour-board"
                className="tour-input"
                value={boardDraft}
                onChange={(event) => setBoardDraft(event.target.value)}
                placeholder="e.g. Ember Jam Studio"
                maxLength={40}
                data-testid="tour-board-input"
              />
              <button type="submit" className="secondary-btn tour-btn" data-testid="tour-board-save">
                {state.boardName ? 'Rename' : 'Create'}
              </button>
            </div>
          </form>

          <form className="tour-field" onSubmit={addProject}>
            <label htmlFor="tour-project">Project</label>
            <div className="tour-field-row">
              <input
                id="tour-project"
                className="tour-input"
                value={projectDraft}
                onChange={(event) => setProjectDraft(event.target.value)}
                placeholder="e.g. Vertical slice"
                maxLength={40}
                data-testid="tour-project-input"
              />
              <button type="submit" className="secondary-btn tour-btn" data-testid="tour-project-add">
                Add
              </button>
            </div>
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
              <button type="submit" className="primary-btn tour-btn" data-testid="tour-task-add">
                Add task
              </button>
            </div>
          </form>

          <form className="tour-field" onSubmit={invite}>
            <label htmlFor="tour-invite">Invite teammate</label>
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
              <button type="submit" className="secondary-btn tour-btn" data-testid="tour-invite-add">
                Invite
              </button>
            </div>
          </form>

          <div className="tour-field">
            <span className="tour-field-label">Insights</span>
            <button
              type="button"
              className="secondary-btn tour-peek-btn"
              onClick={togglePeek}
              aria-expanded={state.peeked}
              data-testid="tour-peek"
            >
              {state.peeked ? 'Hide calendar and reports' : 'Peek at calendar and reports'}
            </button>
          </div>

          {state.roster.length > 0 ? (
            <p className="tour-roster" data-testid="tour-roster">
              <span className="tour-field-label">Roster</span>
              {state.roster.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="tour-board-wrap">
          <div className="tour-board-bar">
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
                <span className="tour-insight-label">Shipped</span>
                <strong>{grouped.shipped.length}</strong>
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
                          title={task.status === 'shipped' ? 'Shipped' : 'Move to next column'}
                          disabled={task.status === 'shipped'}
                          data-testid="tour-card-advance"
                        >
                          <span className={`tour-tag tour-tag--${task.discipline.toLowerCase()}`}>
                            {task.discipline}
                          </span>
                          <span className="tour-card-title">{task.title}</span>
                          <span className="tour-card-move" aria-hidden="true">
                            {task.status === 'shipped' ? '✓' : '→'}
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

      {finished ? (
        <div className="tour-win" role="status" data-testid="tour-win">
          <span className="tour-win-spark" aria-hidden="true">
            <FlameHorse size={44} />
          </span>
          <p>Milestone shipped. That is a full lap around Inferno, from empty board to final polish.</p>
        </div>
      ) : null}

      <div className="tour-footer">
        <button type="button" className="secondary-btn tour-reset" onClick={reset} data-testid="tour-reset">
          Restart quest
        </button>
        <p className="tour-note muted-copy">Runs entirely in your browser. Nothing here is saved.</p>
      </div>
    </div>
  )
}
