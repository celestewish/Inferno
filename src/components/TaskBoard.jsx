import { useState } from 'react'
import InlineText from './InlineText'
import InfernoLogo from './InfernoLogo'
import DatePicker from './DatePicker.jsx'

const priorityTone = { High: 'high', Medium: 'medium', Low: 'low' }

export default function TaskBoard({
  columns,
  tasks,
  teamMembers,
  updateTask,
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

  const submitSection = (event) => {
    event.preventDefault()
    const label = newSection.trim()
    if (!label) return
    onAddSection?.(label)
    setNewSection('')
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
              {columnTasks.map((task, index) => (
                <article
                  key={task.id}
                  className={task.completed ? 'task-card completed' : 'task-card'}
                  draggable
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <div className="card-topline">
                    <span className={`priority-badge ${priorityTone[task.priority]}`}>{task.priority}</span>
                    <div className="label-row">
                      {task.labels?.map((label) => (
                        <span key={label} className="task-label">{label}</span>
                      ))}
                    </div>
                  </div>

                  <InlineText
                    className="task-title-inline"
                    value={task.title}
                    onSave={(value) => updateTask(task.id, { title: value })}
                  />

                  <InlineText
                    className="task-body-inline"
                    multiline
                    value={task.description}
                    onSave={(value) => updateTask(task.id, { description: value })}
                  />

                  <dl className="meta-grid">
                    <div>
                      <dt>Assignee</dt>
                      <dd>
                        <select
                          className="inline-select"
                          value={task.assignee}
                          onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                        >
                          {teamMembers.map((member) => <option key={member}>{member}</option>)}
                        </select>
                      </dd>
                    </div>

                    <div>
                      <dt>Discipline</dt>
                      <dd>{task.discipline}</dd>
                    </div>

                    <div>
                      <dt>Estimate</dt>
                      <dd>
                        <InlineText
                          value={task.estimate}
                          onSave={(value) => updateTask(task.id, { estimate: value })}
                        />
                      </dd>
                    </div>

                    <div>
                      <dt>Due</dt>
                      <dd>
                        <DatePicker
                          value={task.due}
                          onChange={(iso) => updateTask(task.id, { due: iso })}
                          onClear={() => updateTask(task.id, { due: 'TBD' })}
                        />
                      </dd>
                    </div>
                  </dl>

                  <div className="subtask-list">
                    {task.subtasks?.map((subtask) => (
                      <label key={subtask.id} className="subtask-item">
                        <input
                          type="checkbox"
                          checked={subtask.done}
                          onChange={() =>
                            updateTask(task.id, {
                              subtasks: task.subtasks.map((item) =>
                                item.id === subtask.id ? { ...item, done: !item.done } : item
                              ),
                            })
                          }
                        />
                        <span>{subtask.title}</span>
                      </label>
                    ))}
                  </div>

                  <div className="manipulation-row">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={index === 0}
                      aria-label="Move task up"
                      title="Move up"
                      onClick={() => shiftTask(task.id, -1)}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={index === columnTasks.length - 1}
                      aria-label="Move task down"
                      title="Move down"
                      onClick={() => shiftTask(task.id, 1)}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setEditingTask({ ...task })}
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => toggleComplete(task)}
                    >
                      {task.completed ? 'Reopen' : 'Complete'}
                    </button>

                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => deleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
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
    </section>
  )
}