import InfernoLogo from './InfernoLogo'
import {
  BoardIcon,
  TasksIcon,
  ProjectsIcon,
  FlameIcon,
  TeamIcon,
  CalendarIcon,
  ReportsIcon,
  SettingsIcon,
} from './Icons'

// Each nav item switches the main workspace to a distinct page/view — no more
// scrolling one long board. All items are real, navigable pages. Icons are
// inline SVG components (no emoji) so they render consistently everywhere.
const PRIMARY_NAV = [
  { id: 'board', label: 'Board', Icon: BoardIcon },
  { id: 'tasks', label: 'Tasks', Icon: TasksIcon },
  { id: 'projects', label: 'Projects', Icon: ProjectsIcon },
  { id: 'campfire', label: 'Campfire', Icon: FlameIcon },
  { id: 'team', label: 'Team', Icon: TeamIcon },
]

const SECONDARY_NAV = [
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'reports', label: 'Reports', Icon: ReportsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function ProjectSidebar({
  stats,
  project,
  projects,
  setCurrentProjectId,
  boards = [],
  currentBoardId,
  onSelectBoard,
  onCreateBoard,
  creatingBoard = false,
  onSignOut,
  activeSection = 'board',
  onSelectSection,
  userEmail,
  profile,
  collapsed = false,
  onToggleCollapsed,
}) {
  if (!project) return null

  const displayName = profile?.display_name?.trim()
  const gamerTag = profile?.gamer_tag?.trim()
  const avatarUrl = profile?.avatar_url?.trim()
  const accountLabel = displayName || userEmail || 'Signed in'
  const accountSub = gamerTag || (displayName ? userEmail : null) || 'Signed in'
  const accountInitial = (displayName?.[0] || userEmail?.trim()?.[0] || 'I').toUpperCase()

  const renderNavItem = (item) => {
    const { Icon } = item
    return (
      <li key={item.id}>
        <button
          type="button"
          className={activeSection === item.id ? 'app-nav-item active' : 'app-nav-item'}
          aria-current={activeSection === item.id ? 'page' : undefined}
          data-testid={`nav-${item.id}`}
          onClick={() => onSelectSection?.(item.id)}
        >
          <span className="app-nav-icon" aria-hidden="true"><Icon size={18} /></span>
          <span className="app-nav-label">{item.label}</span>
        </button>
      </li>
    )
  }

  return (
    <aside
      className={collapsed ? 'sidebar app-nav is-collapsed' : 'sidebar app-nav'}
      aria-label="Primary navigation"
      data-testid="app-bottom-nav"
    >
      <div className="brand">
        <button
          type="button"
          className="brand-toggle"
          data-testid="sidebar-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => onToggleCollapsed?.()}
        >
          <InfernoLogo size={30} />
        </button>
        <div className="brand-copy">
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

      <div className="panel board-switcher" data-testid="board-switcher">
        <div className="section-heading">
          <h2>Boards</h2>
          <span>{boards.length}</span>
        </div>
        <div className="project-list">
          {boards.map((item) => (
            <button
              key={item.id}
              type="button"
              className={currentBoardId === item.id ? 'project-tab active' : 'project-tab'}
              aria-current={currentBoardId === item.id ? 'true' : undefined}
              data-testid={`board-tab-${item.id}`}
              onClick={() => onSelectBoard?.(item.id)}
            >
              <strong>{item.name || 'Untitled board'}</strong>
              {item.description ? <small>{item.description}</small> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-btn sidebar-manage-projects"
          data-testid="sidebar-create-board"
          disabled={creatingBoard}
          onClick={() => onCreateBoard?.()}
        >
          {creatingBoard ? 'Creating…' : 'New board'}
        </button>
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
