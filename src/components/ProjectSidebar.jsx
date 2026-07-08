import InfernoLogo from './InfernoLogo'

// Each nav item switches the main workspace to a distinct page/view — no more
// scrolling one long board. All items are real, navigable pages.
const PRIMARY_NAV = [
  { id: 'board', label: 'Board', icon: '▦' },
  { id: 'tasks', label: 'Tasks', icon: '✎' },
  { id: 'projects', label: 'Projects', icon: '◆' },
  { id: 'team', label: 'Team', icon: '◍' },
]

const SECONDARY_NAV = [
  { id: 'calendar', label: 'Calendar', icon: '▤' },
  { id: 'reports', label: 'Reports', icon: '▧' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function ProjectSidebar({
  stats,
  project,
  projects,
  setCurrentProjectId,
  onSignOut,
  activeSection = 'board',
  onSelectSection,
  userEmail,
  profile,
}) {
  if (!project) return null

  const displayName = profile?.display_name?.trim()
  const gamerTag = profile?.gamer_tag?.trim()
  const avatarUrl = profile?.avatar_url?.trim()
  const accountLabel = displayName || userEmail || 'Signed in'
  const accountSub = gamerTag || (displayName ? userEmail : null) || 'Signed in'
  const accountInitial = (displayName?.[0] || userEmail?.trim()?.[0] || 'I').toUpperCase()

  const renderNavItem = (item) => (
    <li key={item.id}>
      <button
        type="button"
        className={activeSection === item.id ? 'app-nav-item active' : 'app-nav-item'}
        aria-current={activeSection === item.id ? 'page' : undefined}
        data-testid={`nav-${item.id}`}
        onClick={() => onSelectSection?.(item.id)}
      >
        <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>
        <span className="app-nav-label">{item.label}</span>
      </button>
    </li>
  )

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
          {PRIMARY_NAV.map(renderNavItem)}
        </ul>

        <p className="app-nav-heading">Insights</p>
        <ul className="app-nav-list">
          {SECONDARY_NAV.map(renderNavItem)}
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

      <div className="panel project-switcher" data-testid="project-switcher">
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
              onClick={() => setCurrentProjectId(item.id)}
            >
              <strong>{item.name}</strong>
              <small>{item.methodology}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-btn sidebar-manage-projects"
          data-testid="sidebar-manage-projects"
          onClick={() => onSelectSection?.('projects')}
        >
          Manage projects
        </button>
      </div>

      <div className="app-nav-account" data-testid="account-block">
        <div className="app-nav-account-id">
          <span className="app-nav-avatar" aria-hidden="true">
            {avatarUrl ? (
              <img className="app-nav-avatar-img" src={avatarUrl} alt="" />
            ) : (
              accountInitial
            )}
          </span>
          <div className="app-nav-account-copy">
            <strong title={accountLabel}>{accountLabel}</strong>
            <small title={accountSub ?? undefined}>{accountSub}</small>
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
