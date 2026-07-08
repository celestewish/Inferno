// Lightweight due-date agenda built from existing task `due` values. Due dates
// are free-text (e.g. "Jun 20", "TBD"), so we best-effort parse them: parseable
// dates form a chronological agenda, everything else falls into "No due date".
const parseDue = (due) => {
  if (!due) return null
  const raw = String(due).trim()
  if (!raw || /^tbd$/i.test(raw)) return null
  let parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    parsed = new Date(`${raw} ${new Date().getFullYear()}`)
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const dayKey = (date) => date.toISOString().slice(0, 10)

const dayLabel = (date) =>
  date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

export default function CalendarView({ tasks, projects, onOpenTask }) {
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? 'Project'

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const dated = []
  const undated = []
  tasks.forEach((task) => {
    const date = parseDue(task.due)
    if (date) dated.push({ task, date })
    else undated.push(task)
  })

  dated.sort((a, b) => a.date - b.date)

  const groups = []
  const groupIndex = new Map()
  dated.forEach(({ task, date }) => {
    const key = dayKey(date)
    if (!groupIndex.has(key)) {
      groupIndex.set(key, groups.length)
      groups.push({ key, date, items: [] })
    }
    groups[groupIndex.get(key)].items.push(task)
  })

  const overdueCount = dated.filter(
    ({ task, date }) => date < startOfToday && !task.completed
  ).length

  return (
    <section className="calendar-view" data-testid="calendar-view" aria-label="Calendar">
      <header className="view-header">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Calendar</h1>
          <p className="muted-copy">
            Upcoming work by due date across every project on this board.
          </p>
        </div>
        <div className="view-header-stats">
          <div className="mini-stat">
            <span>{dated.length}</span>
            <p>Scheduled</p>
          </div>
          <div className="mini-stat">
            <span>{overdueCount}</span>
            <p>Overdue</p>
          </div>
        </div>
      </header>

      {groups.length ? (
        <ol className="agenda">
          {groups.map((group) => {
            const isOverdue = group.date < startOfToday
            return (
              <li key={group.key} className="agenda-day">
                <div className={isOverdue ? 'agenda-date overdue' : 'agenda-date'}>
                  <strong>{dayLabel(group.date)}</strong>
                  {isOverdue ? <small>Overdue</small> : null}
                </div>
                <ul className="agenda-items">
                  {group.items.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        className="agenda-item"
                        data-testid={`agenda-item-${task.id}`}
                        onClick={() => onOpenTask({ ...task })}
                      >
                        <span className={task.completed ? 'agenda-title done' : 'agenda-title'}>
                          {task.title}
                        </span>
                        <span className="agenda-sub">
                          {projectName(task.projectId)} · {task.assignee}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="panel view-empty" data-testid="calendar-empty">
          <p className="muted-copy">
            No tasks have a recognizable due date yet. Add due dates to tasks and they'll appear here as an agenda.
          </p>
        </div>
      )}

      {undated.length ? (
        <div className="panel agenda-undated" data-testid="calendar-undated">
          <div className="section-heading">
            <h2>No due date</h2>
            <span>{undated.length}</span>
          </div>
          <ul className="agenda-items">
            {undated.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="agenda-item"
                  onClick={() => onOpenTask({ ...task })}
                >
                  <span className={task.completed ? 'agenda-title done' : 'agenda-title'}>
                    {task.title}
                  </span>
                  <span className="agenda-sub">
                    {projectName(task.projectId)} · {task.assignee}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
