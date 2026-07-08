import { useRef } from 'react'
import InfernoLogo from './InfernoLogo'

// Primary nav maps to real, in-page areas of the single-scroll board app.
const PRIMARY_NAV = [
  { id: 'board', label: 'Board', icon: '▦' },
  { id: 'projects', label: 'Projects', icon: '◆' },
  { id: 'tasks', label: 'Tasks', icon: '✎' },
  { id: 'team', label: 'Team', icon: '◍' },
]

// Not built yet — shown as clearly-disabled "coming soon" items so the nav
// reads like the full concept without offering broken navigation.
const COMING_SOON_NAV = [
  { id: 'calendar', label: 'Calendar', icon: '▤' },
  { id: 'reports', label: 'Reports', icon: '▧' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

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
  onSignOut,
  activeSection = 'board',
  onSelectSection,
  userEmail,
}) {
  const projectsRef = useRef(null)
  const teamRef = useRef(null)

  if (!project) return null

  const handleNav = (sectionId) => {
    onSelectSection?.(sectionId)
    if (sectionId === 'projects') {
      projectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else if (sectionId === 'team') {
      teamRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const accountLabel = userEmail || 'Signed in'
  const accountInitial = (userEmail?.trim()?.[0] || 'I').toUpperCase()

  return (
    <aside className="sidebar app-nav" aria-label="Primary navigation">
      <div className="brand">
        <InfernoLogo size={30} />
        <div>
          <h2>Inferno</h2>
          <p className="muted-copy">The game design task board</p>
        </div>
      </div>

      <nav className="app-nav-menu" aria-label="Sections">
        <p className="app-nav-heading">Workspace</p>
        <ul className="app-nav-list">
          {PRIMARY_NAV.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={activeSection === item.id ? 'app-nav-item active' : 'app-nav-item'}
                aria-current={activeSection === item.id ? 'page' : undefined}
                data-testid={`nav-${item.id}`}
                onClick={() => handleNav(item.id)}
              >
                <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="app-nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="app-nav-heading">More</p>
        <ul className="app-nav-list">
          {COMING_SOON_NAV.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="app-nav-item"
                disabled
                aria-disabled="true"
                data-testid={`nav-${item.id}`}
                title={`${item.label} — coming soon`}
              >
                <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="app-nav-label">{item.label}</span>
                <span className="app-nav-soon">Soon</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

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

      <div className="panel project-switcher" ref={projectsRef} data-testid="project-switcher">
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
              aria-current={project.id === item.id ? 'true' : undefined}
              data-testid={`project-tab-${item.id}`}
              onClick={() => {
                setCurrentProjectId(item.id)
                onSelectSection?.('projects')
              }}
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
          <button type="submit" className="primary-btn" data-testid="create-project">Create project</button>
          <button
            type="button"
            className="danger-btn"
            onClick={() => deleteProject(project.id)}
          >Delete project</button>
        </form>
      </div>

      <div className="panel team-panel" ref={teamRef} data-testid="team-panel">
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

      <details className="panel theme-panel">
        <summary className="theme-panel-summary">
          <span>Customize colors</span>
          <span className="theme-panel-caret" aria-hidden="true">▾</span>
        </summary>
        <div className="theme-panel-body">
          <label>Accent<input type="color" value={theme.accent} onChange={(e) => setTheme((c) => ({ ...c, accent: e.target.value }))} /></label>
          <label>Accent 2<input type="color" value={theme.accentSecondary} onChange={(e) => setTheme((c) => ({ ...c, accentSecondary: e.target.value }))} /></label>
          <label>Surface<input type="color" value={theme.surface} onChange={(e) => setTheme((c) => ({ ...c, surface: e.target.value }))} /></label>
          <label>Background<input type="color" value={theme.background} onChange={(e) => setTheme((c) => ({ ...c, background: e.target.value }))} /></label>
        </div>
      </details>

      <div className="app-nav-account" data-testid="account-block">
        <div className="app-nav-account-id">
          <span className="app-nav-avatar" aria-hidden="true">{accountInitial}</span>
          <div className="app-nav-account-copy">
            <strong title={accountLabel}>{accountLabel}</strong>
            <small>Signed in</small>
          </div>
        </div>
        <button
          type="button"
          className="danger-btn app-nav-signout"
          data-testid="sign-out"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
