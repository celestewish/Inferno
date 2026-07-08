import { formatDueLabel } from '../lib/dates.js'

const priorityTone = { High: 'high', Medium: 'medium', Low: 'low' }

// Focused, low-scroll task management view: search + discipline filter, then a
// flat list grouped by pipeline section. Reuses the board's task data and the
// same edit / complete / delete actions.
export default function TasksView({
  project,
  tasks,
  sections,
  search,
  setSearch,
  filter,
  setFilter,
  disciplines,
  onOpenTask,
  toggleComplete,
  deleteTask,
  onCreateTask,
}) {
  const sectionLabel = (id) =>
    sections.find((section) => section.id === id)?.label ?? id

  const grouped = sections
    .map((section) => ({
      section,
      items: tasks.filter((task) => task.status === section.id),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <section className="tasks-view" data-testid="tasks-view" aria-label="Tasks">
      <header className="view-header">
        <div>
          <p className="eyebrow">{project?.name}</p>
          <h1>Tasks</h1>
          <p className="muted-copy">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} matching your view.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          data-testid="tasks-new"
          onClick={onCreateTask}
        >
          New task
        </button>
      </header>

      <div className="panel tasks-toolbar">
        <input
          className="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks or assignees"
          aria-label="Search tasks"
          data-testid="tasks-search"
        />
        <div className="filter-chips">
          {['All', ...disciplines].map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'chip active' : 'chip'}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {grouped.length ? (
        <div className="tasks-groups">
          {grouped.map(({ section, items }) => (
            <div key={section.id} className="tasks-group">
              <div className="tasks-group-head">
                <h2>{section.label}</h2>
                <span>{items.length}</span>
              </div>
              <ul className="tasks-list">
                {items.map((task) => (
                  <li
                    key={task.id}
                    className={task.completed ? 'task-row completed' : 'task-row'}
                    data-testid={`task-row-${task.id}`}
                  >
                    <div className="task-row-main">
                      <div className="task-row-title">
                        <span className={`priority-badge ${priorityTone[task.priority]}`}>
                          {task.priority}
                        </span>
                        <strong>{task.title}</strong>
                      </div>
                      <div className="task-row-meta">
                        <span>{task.discipline}</span>
                        <span>·</span>
                        <span>{task.assignee}</span>
                        <span>·</span>
                        <span>{sectionLabel(task.status)}</span>
                        {task.due && !/^tbd$/i.test(String(task.due).trim()) ? (
                          <>
                            <span>·</span>
                            <span>Due {formatDueLabel(task.due) ?? task.due}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="task-row-actions">
                      <button
                        type="button"
                        className="secondary-btn chip-action"
                        onClick={() => onOpenTask({ ...task })}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="secondary-btn chip-action"
                        onClick={() => toggleComplete(task)}
                      >
                        {task.completed ? 'Reopen' : 'Complete'}
                      </button>
                      <button
                        type="button"
                        className="chip-action danger"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel view-empty" data-testid="tasks-empty">
          <p className="muted-copy">
            No tasks match your search or filter. Try clearing filters or create a new task.
          </p>
          <button type="button" className="primary-btn" onClick={onCreateTask}>
            Create a task
          </button>
        </div>
      )}
    </section>
  )
}
