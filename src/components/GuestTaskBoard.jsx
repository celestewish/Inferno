// Read-only board renderer for the guest link view. Mirrors TaskBoard's
// column/card markup and class names (so it inherits the same CSS) but drops
// every write affordance: no drag-and-drop, no manipulation-row buttons, no
// click-to-edit. There's no mutate path reachable from this component.
const priorityTone = { High: 'high', Medium: 'medium', Low: 'low' }

export default function GuestTaskBoard({ columns, tasks }) {
  if (tasks.length === 0) {
    return (
      <section className="guest-board-empty panel" aria-live="polite">
        <p className="eyebrow">Nothing here yet</p>
        <h2>This board doesn't have any tasks yet</h2>
        <p className="muted-copy">Check back once the team starts adding work.</p>
      </section>
    )
  }

  return (
    <section className="board-grid">
      {columns.map((column) => {
        const columnTasks = tasks
          .filter((task) => task.status === column.id)
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

        return (
          <div key={column.id} className="column">
            <div className="column-header">
              <h3>{column.label}</h3>
              <span>{columnTasks.length}</span>
            </div>

            <div className="column-cards">
              {columnTasks.map((task) => {
                const hasDueDate = task.due && task.due !== 'TBD'
                return (
                  <article key={task.id} className="task-card compact" data-testid="guest-task-card">
                    <div className="card-topline">
                      <span className={`priority-badge ${priorityTone[task.priority] ?? ''}`}>{task.priority}</span>
                      <span className="card-discipline-chip">{task.discipline}</span>
                    </div>

                    <h4 className="task-card-title">{task.title}</h4>

                    <div className="task-card-meta-row">
                      <span className="task-card-meta-item">{task.assignee}</span>
                      {hasDueDate ? <span className="task-card-meta-item">Due {task.due}</span> : null}
                    </div>

                    {task.labels?.length ? (
                      <div className="label-row">
                        {task.labels.map((label) => (
                          <span key={label} className="task-label">{label}</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
