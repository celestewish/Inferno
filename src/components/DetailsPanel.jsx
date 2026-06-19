export default function DetailsPanel({ project, tasks, labelPool }) {
  const projectTasks = tasks.filter((task) => task.projectId === project.id)
  const activity = [...(project.activity || []), ...projectTasks.flatMap((task) => task.activity?.map((item) => ({ ...item, taskTitle: task.title })) || [])]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8)

  return (
    <section className="details-grid">
      <div className="panel detail-panel">
        <div className="section-heading"><h2>Design pillars</h2></div>
        <div className="pillars-wrap">
          {project.pillars?.map((pillar) => <span key={pillar} className="task-label large">{pillar}</span>)}
        </div>
        <p className="muted-copy">Use project settings to express the design intent, production methodology, and player-facing constraints that make the project stand out.</p>
      </div>
      <div className="panel detail-panel">
        <div className="section-heading"><h2>Project labels</h2></div>
        <div className="pillars-wrap">
          {[...(project.labels || []), ...labelPool.filter((item) => !(project.labels || []).includes(item)).slice(0, 4)].map((label) => (
            <span key={label} className="task-label large">{label}</span>
          ))}
        </div>
      </div>
      <div className="panel detail-panel activity-panel">
        <div className="section-heading"><h2>Activity history</h2></div>
        <div className="activity-list">
          {activity.map((item) => (
            <div key={item.id} className="activity-item">
              <span className={`activity-dot ${item.type}`}></span>
              <div>
                <strong>{item.actor}</strong>
                <p>{item.text}{item.taskTitle ? ` · ${item.taskTitle}` : ''}</p>
                <small>{new Date(item.timestamp).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
