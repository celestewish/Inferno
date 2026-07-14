import { useState } from 'react'
import InfernoLogo from './InfernoLogo'

const priorityTone = { High: 'high', Medium: 'medium', Low: 'low' }

export default function TaskBoard({
  columns,
  tasks,
  toggleComplete,
  deleteTask,
  shiftTask,
  setEditingTask,
  draggingId,
  setDraggingId,
  moveTask,
  onCreateFirstTask,
  onAddSection,
  onRemoveSection,
}) {
  const [newSection, setNewSection] = useState('')
  // Transient completion feedback: which card just got marked done (drives the
  // celebratory glow pop) and where to spawn the pulse. Both are cosmetic and
  // self-clear, so they never touch the real completed state in `tasks`.
  const [justCompletedId, setJustCompletedId] = useState(null)
  const [pulse, setPulse] = useState(null)

  const submitSection = (event) => {
    event.preventDefault()
    const label = newSection.trim()
    if (!label) return
    onAddSection?.(label)
    setNewSection('')
  }

  const handleComplete = (task, event) => {
    if (!task.completed) {
      setJustCompletedId(task.id)
      setTimeout(() => setJustCompletedId((current) => (current === task.id ? null : current)), 650)
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setPulse({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, key: Date.now() })
    clearTimeout(handleComplete._t)
    handleComplete._t = setTimeout(() => setPulse(null), 500)
    toggleComplete(task)
  }

  const isEmpty = tasks.length === 0

  if (isEmpty) {
    return (
      <section className="board-empty panel" aria-live="polite">
        <div className="board-empty-icon">
          <InfernoLogo size={54} />
        </div>

        <div className="board-empty-copy">
          <p className="eyebrow">Start here</p>
          <h2>Build your first production board</h2>
          <p className="muted-copy">
            Tasks for design, UI, combat, audio, and polish will appear here once you add your first item.
            Start with one clear task, then drag it across the pipeline as work moves forward.
          </p>
        </div>

        <div className="board-empty-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={onCreateFirstTask}
          >
            Create your first task
          </button>
        </div>

        <div className="board-empty-steps">
          <div className="board-empty-step">
            <span>1</span>
            <p>Create your first task from the quick-create bar above.</p>
          </div>
          <div className="board-empty-step">
            <span>2</span>
            <p>Assign it to a teammate and pick a discipline.</p>
          </div>
          <div className="board-empty-step">
            <span>3</span>
            <p>Move it from Backlog to Done as the feature progresses.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="board-grid">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id)
        return (
          <div
            key={column.id}
            className="column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggingId) moveTask(draggingId, column.id)
              setDraggingId(null)
            }}
          >
            <div className="column-header">
              <h3>{column.label}</h3>
              <div className="column-header-actions">
                <span>{columnTasks.length}</span>
                {onRemoveSection && columns.length > 1 ? (
                  <button
                    type="button"
                    className="section-remove-btn"
                    aria-label={`Remove ${column.label} section`}
                    title="Remove section"
                    onClick={() => onRemoveSection(column.id)}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>

            <div className="column-cards">
              {columnTasks.map((task, index) => {
                const openDetails = () => setEditingTask({ ...task })
                const totalSubtasks = task.subtasks?.length ?? 0
                const doneSubtasks = task.subtasks?.filter((item) => item.done).length ?? 0
                const hasDueDate = task.due && task.due !== 'TBD'
                const cardClass = [
                  'task-card compact',
                  task.completed ? 'completed' : '',
                  justCompletedId === task.id ? 'is-complete-pop' : '',
                ].filter(Boolean).join(' ')
                return (
                  <article
                    key={task.id}
                    className={cardClass}
                    data-testid="task-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${task.title}`}
                    draggable
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={openDetails}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openDetails()
                      }
                    }}
                  >
                    <div className="card-topline">
                      <span className={`priority-badge ${priorityTone[task.priority]}`}>{task.priority}</span>
                      <span className="card-discipline-chip">{task.discipline}</span>
                    </div>

                    <h4 className="task-card-title">{task.title}</h4>

                    <div className="task-card-meta-row">
                      <span className="task-card-meta-item">{task.assignee}</span>
                      {hasDueDate ? <span className="task-card-meta-item">Due {task.due}</span> : null}
                      {totalSubtasks ? (
                        <span className="task-card-meta-item">{doneSubtasks}/{totalSubtasks} subtasks</span>
                      ) : null}
                    </div>

                    {task.labels?.length ? (
                      <div className="label-row">
                        {task.labels.map((label) => (
                          <span key={label} className="task-label">{label}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="manipulation-row" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={index === 0}
                        aria-label="Move task up"
                        title="Move up"
                        onClick={(event) => { event.stopPropagation(); shiftTask(task.id, -1) }}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={index === columnTasks.length - 1}
                        aria-label="Move task down"
                        title="Move down"
                        onClick={(event) => { event.stopPropagation(); shiftTask(task.id, 1) }}
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(event) => { event.stopPropagation(); openDetails() }}
                      >
                        Details
                      </button>

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={(event) => { event.stopPropagation(); handleComplete(task, event) }}
                      >
                        {task.completed ? 'Reopen' : 'Complete'}
                      </button>

                      <button
                        type="button"
                        className="danger-btn"
                        onClick={(event) => { event.stopPropagation(); deleteTask(task.id) }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )
      })}

      {onAddSection ? (
        <div className="column column-add-section">
          <div className="column-header">
            <h3>Add section</h3>
          </div>
          <form className="add-section-form" onSubmit={submitSection}>
            <input
              value={newSection}
              onChange={(event) => setNewSection(event.target.value)}
              placeholder="New section name"
              aria-label="New section name"
              maxLength={40}
            />
            <button type="submit" className="secondary-btn" disabled={!newSection.trim()}>
              Add
            </button>
          </form>
          <p className="add-section-hint">
            Sections are shared across this board's projects and saved automatically.
          </p>
        </div>
      ) : null}

      {pulse ? (
        <div
          className="action-pulse"
          aria-hidden="true"
          style={{ left: pulse.x, top: pulse.y }}
        />
      ) : null}
    </section>
  )
}
