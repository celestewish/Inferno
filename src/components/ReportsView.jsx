// Lightweight reporting dashboard derived entirely from existing board data:
// totals, completion, and breakdowns by status, priority, and discipline.
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function Breakdown({ title, rows, total, testid }) {
  return (
    <div className="panel report-breakdown" data-testid={testid}>
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {rows.length ? (
        <ul className="report-bars">
          {rows.map((row) => (
            <li key={row.label} className="report-bar-row">
              <div className="report-bar-label">
                <span>{row.label}</span>
                <span>{row.count}</span>
              </div>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill"
                  style={{ width: `${pct(row.count, total)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-copy">No data yet.</p>
      )}
    </div>
  )
}

export default function ReportsView({ tasks, projects, sections, priorities, disciplines }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.completed).length
  const inFlight = tasks.filter(
    (t) => ['inprogress', 'review'].includes(t.status) && !t.completed
  ).length
  const backlog = tasks.filter((t) => t.status === 'backlog').length

  const countBy = (predicate) => tasks.filter(predicate).length

  const statusRows = sections.map((section) => ({
    label: section.label,
    count: countBy((t) => t.status === section.id),
  }))

  const priorityRows = priorities.map((priority) => ({
    label: priority,
    count: countBy((t) => t.priority === priority),
  }))

  const disciplineRows = disciplines
    .map((discipline) => ({
      label: discipline,
      count: countBy((t) => t.discipline === discipline),
    }))
    .filter((row) => row.count > 0)

  const projectRows = projects.map((project) => {
    const projectTasks = tasks.filter((t) => t.projectId === project.id)
    const projectDone = projectTasks.filter((t) => t.completed).length
    return {
      id: project.id,
      name: project.name,
      total: projectTasks.length,
      done: projectDone,
      progress: pct(projectDone, projectTasks.length),
    }
  })

  return (
    <section className="reports-view" data-testid="reports-view" aria-label="Reports">
      <header className="view-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Reports</h1>
          <p className="muted-copy">A snapshot of production progress across the whole board.</p>
        </div>
      </header>

      <div className="report-kpis">
        <div className="panel report-kpi" data-testid="kpi-total">
          <span>{total}</span>
          <p>Total tasks</p>
        </div>
        <div className="panel report-kpi" data-testid="kpi-done">
          <span>{done}</span>
          <p>Completed</p>
        </div>
        <div className="panel report-kpi" data-testid="kpi-inflight">
          <span>{inFlight}</span>
          <p>In pipeline</p>
        </div>
        <div className="panel report-kpi" data-testid="kpi-backlog">
          <span>{backlog}</span>
          <p>In backlog</p>
        </div>
        <div className="panel report-kpi" data-testid="kpi-completion">
          <span>{pct(done, total)}%</span>
          <p>Completion</p>
        </div>
      </div>

      <div className="report-grid">
        <Breakdown title="By status" rows={statusRows} total={total} testid="report-status" />
        <Breakdown title="By priority" rows={priorityRows} total={total} testid="report-priority" />
        <Breakdown title="By discipline" rows={disciplineRows} total={total} testid="report-discipline" />
      </div>

      <div className="panel report-projects" data-testid="report-projects">
        <div className="section-heading">
          <h2>Progress by project</h2>
          <span>{projects.length}</span>
        </div>
        <ul className="report-project-list">
          {projectRows.map((row) => (
            <li key={row.id} className="report-project-row">
              <div className="report-project-head">
                <strong>{row.name}</strong>
                <span>{row.done}/{row.total} done · {row.progress}%</span>
              </div>
              <div className="report-bar-track">
                <div className="report-bar-fill" style={{ width: `${row.progress}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
