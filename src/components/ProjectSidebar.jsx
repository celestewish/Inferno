export default function ProjectSidebar({
  stats,
  project,
  projects,
  setCurrentProjectId,
  newProject,
  setNewProject,
  createProject,
  teamMembers,
  newMember,
  setNewMember,
  addTeamMember,
  removeTeamMember,
  theme,
  setTheme,
  methodologies,
  gameCategories,
  deleteProject,
}) {
  if (!project) return null
  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow"></p>
        <h1>Inferno</h1>
        <p className="sidebar-copy">
          The game design task board.
        </p>
      </div>

      <div className="panel stats-panel">
        <div>
          <span>{stats.done}</span>
          <p>Tasks completed</p>
        </div>
        <div>
          <span>{stats.inFlight}</span>
          <p>In active pipeline</p>
        </div>
        <div>
          <span>{stats.projects}</span>
          <p>Tracked projects</p>
        </div>
      </div>

      <div className="panel project-switcher">
        <div className="section-heading">
          <h2>Projects</h2>
          <span>{projects.length}</span>
        </div>
        <div className="project-list">
          {projects.map((item) => (
            <button
              key={item.id}
              type="button"
              className={project.id === item.id ? 'project-tab active' : 'project-tab'}
              onClick={() => setCurrentProjectId(item.id)}
            >
              <strong>{item.name}</strong>
              <small>{item.methodology}</small>
            </button>
          ))}
        </div>
        <form className="team-form" onSubmit={createProject}>
          <input value={newProject.name} onChange={(e) => setNewProject((c) => ({ ...c, name: e.target.value }))} placeholder="New project name" />
          <input value={newProject.tagline} onChange={(e) => setNewProject((c) => ({ ...c, tagline: e.target.value }))} placeholder="Short tagline" />
          <div className="form-row">
            <select value={newProject.category} onChange={(e) => setNewProject((c) => ({ ...c, category: e.target.value }))}>
              {gameCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={newProject.methodology} onChange={(e) => setNewProject((c) => ({ ...c, methodology: e.target.value }))}>
              {methodologies.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <button type="submit" className="primary-btn">Create project</button>
          <button
            type="button"
            className="danger-btn"
            onClick={() => deleteProject(project.id)}
          >Delete project</button>
        </form>
      </div>

      <div className="panel team-panel">
        <div className="section-heading">
          <h2>Team</h2>
          <span>{teamMembers.length}</span>
        </div>
        <form onSubmit={addTeamMember} className="team-form">
          <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Add team member" />
          <button type="submit" className="secondary-btn">Add</button>
        </form>
        <div className="member-list">
          {teamMembers.map((member) => (
            <div key={member} className="member-chip-row">
              <span className="discipline-pill">{member}</span>
              {member !== 'Unassigned' && (
                <button type="button" className="chip-action" onClick={() => removeTeamMember(member)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="danger-btn"
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>

      <div className="panel theme-panel">
        <div className="section-heading">
          <h2>Colors</h2>
        </div>
        <label>Accent<input type="color" value={theme.accent} onChange={(e) => setTheme((c) => ({ ...c, accent: e.target.value }))} /></label>
        <label>Accent 2<input type="color" value={theme.accentSecondary} onChange={(e) => setTheme((c) => ({ ...c, accentSecondary: e.target.value }))} /></label>
        <label>Surface<input type="color" value={theme.surface} onChange={(e) => setTheme((c) => ({ ...c, surface: e.target.value }))} /></label>
        <label>Background<input type="color" value={theme.background} onChange={(e) => setTheme((c) => ({ ...c, background: e.target.value }))} /></label>
      </div>
    </aside>
  )
}
