import DatePicker from './DatePicker.jsx'

export default function TaskModal({ editingTask, setEditingTask, handleEditSave, teamMembers, columns, disciplines, priorities, labelPool, projects = [], deleteTask, addSubtaskToEditing }) {
  if (!editingTask) return null

  return (
    <div className="modal-backdrop" onClick={() => setEditingTask(null)} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Task details</p>
            <h2>{editingTask.title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close task details" onClick={() => setEditingTask(null)}>✕</button>
        </div>
        <form className="modal-form" onSubmit={handleEditSave}>
          <input value={editingTask.title} onChange={(e) => setEditingTask((c) => ({ ...c, title: e.target.value }))} placeholder="Task title" />
          <textarea className="modal-description" rows="6" value={editingTask.description} onChange={(e) => setEditingTask((c) => ({ ...c, description: e.target.value }))} placeholder="Task description" />
          <div className="form-row">
            <select value={editingTask.discipline} onChange={(e) => setEditingTask((c) => ({ ...c, discipline: e.target.value }))}>
              {disciplines.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={editingTask.priority} onChange={(e) => setEditingTask((c) => ({ ...c, priority: e.target.value }))}>
              {priorities.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="form-row">
            <select value={editingTask.assignee} onChange={(e) => setEditingTask((c) => ({ ...c, assignee: e.target.value }))}>
              {teamMembers.map((member) => <option key={member}>{member}</option>)}
            </select>
            <select value={editingTask.status} onChange={(e) => setEditingTask((c) => ({ ...c, status: e.target.value }))}>
              {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
            </select>
          </div>
          {projects.length > 1 ? (
            <label className="form-field">
              <span className="form-field-label">Project</span>
              <select
                value={editingTask.projectId}
                data-testid="task-project-select"
                onChange={(e) => setEditingTask((c) => ({ ...c, projectId: e.target.value }))}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="form-row">
            <input value={editingTask.sprint} onChange={(e) => setEditingTask((c) => ({ ...c, sprint: e.target.value }))} placeholder="Sprint" />
            <input value={editingTask.estimate} onChange={(e) => setEditingTask((c) => ({ ...c, estimate: e.target.value }))} placeholder="Estimate" />
          </div>
          <div className="form-field">
            <span className="form-field-label">Due date</span>
            <DatePicker
              value={editingTask.due}
              onChange={(iso) => setEditingTask((c) => ({ ...c, due: iso }))}
              onClear={() => setEditingTask((c) => ({ ...c, due: '' }))}
            />
          </div>
          <div className="modal-labels">
            {labelPool.map((label) => (
              <button
                key={label}
                type="button"
                className={editingTask.labels?.includes(label) ? 'chip active' : 'chip'}
                onClick={() => setEditingTask((current) => ({
                  ...current,
                  labels: current.labels?.includes(label)
                    ? current.labels.filter((item) => item !== label)
                    : [...(current.labels || []), label],
                }))}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="modal-subtasks">
            <div className="section-heading"><h2>Subtasks</h2></div>
            {editingTask.subtasks?.map((subtask) => (
              <label key={subtask.id} className="subtask-item">
                <input
                  type="checkbox"
                  checked={subtask.done}
                  onChange={() => setEditingTask((current) => ({
                    ...current,
                    subtasks: current.subtasks.map((item) => item.id === subtask.id ? { ...item, done: !item.done } : item),
                  }))}
                />
                <span>{subtask.title}</span>
              </label>
            ))}
            <button type="button" className="secondary-btn" onClick={addSubtaskToEditing}>Add subtask</button>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editingTask.completed}
              onChange={(e) => setEditingTask((current) => ({
                ...current,
                completed: e.target.checked,
                status: e.target.checked ? 'done' : current.status === 'done' ? 'todo' : current.status,
              }))}
            />
            Mark task as complete
          </label>
          <div className="card-actions">
            <button type="button" className="danger-btn" onClick={() => deleteTask(editingTask.id)}>Delete task</button>
            <button type="button" className="secondary-btn" onClick={() => setEditingTask(null)}>Cancel</button>
            <button type="submit" className="primary-btn">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
