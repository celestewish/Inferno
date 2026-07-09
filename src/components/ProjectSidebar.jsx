import InfernoLogo from './InfernoLogo'
import {
  HomeIcon,
  BoardIcon,
  TasksIcon,
  ProjectsIcon,
  FlameIcon,
  BookIcon,
  ForgeIcon,
  HeadsetIcon,
  TemplateIcon,
  TeamIcon,
  CalendarIcon,
  ReportsIcon,
  RecapIcon,
  PortfolioIcon,
  BellIcon,
  SearchIcon,
  SettingsIcon,
  CloseIcon,
} from './Icons'

// Each nav item switches the main workspace to a distinct page/view — no more
// scrolling one long board. All items are real, navigable pages. Icons are
// inline SVG components (no emoji) so they render consistently everywhere.
const PRIMARY_NAV = [
  { id: 'home', label: 'Studio Home', Icon: HomeIcon },
  { id: 'board', label: 'Board', Icon: BoardIcon },
  { id: 'tasks', label: 'Tasks', Icon: TasksIcon },
  { id: 'projects', label: 'Projects', Icon: ProjectsIcon },
  { id: 'campfire', label: 'Campfire', Icon: FlameIcon },
  { id: 'docs', label: 'Docs Hub', Icon: BookIcon },
  { id: 'codeforge', label: 'Code Forge', Icon: ForgeIcon },
  { id: 'warroom', label: 'War Room', Icon: HeadsetIcon },
  { id: 'templates', label: 'Templates', Icon: TemplateIcon },
  { id: 'team', label: 'Team', Icon: TeamIcon },
]

const SECONDARY_NAV = [
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'reports', label: 'Reports', Icon: ReportsIcon },
  { id: 'recaps', label: 'Recaps', Icon: RecapIcon },
  { id: 'portfolio', label: 'Portfolio', Icon: PortfolioIcon },
  { id: 'notifications', label: 'Notifications', Icon: BellIcon },
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
  onOpenSearch,
  unreadCount = 0,
  userEmail,
  profile,
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onRequestClose,
}) {
  if (!project) return null

  // On mobile the sidebar is an off-canvas drawer; every navigation action also
  // dismisses it. On desktop onRequestClose is a no-op passed by the shell.
  const closeDrawer = () => onRequestClose?.()

  const displayName = profile?.display_name?.trim()
  const gamerTag = profile?.gamer_tag?.trim()
  const avatarUrl = profile?.avatar_url?.trim()
  const accountLabel = displayName || userEmail || 'Signed in'
  const accountSub = gamerTag || (displayName ? userEmail : null) || 'Signed in'
  const accountInitial = (displayName?.[0] || userEmail?.trim()?.[0] || 'I').toUpperCase()

  const renderNavItem = (item) => {
    const { Icon } = item
    const showBadge = item.id === 'notifications' && unreadCount > 0
    return (
      <li key={item.id}>
        <button
          type="button"
          className={activeSection === item.id ? 'app-nav-item active' : 'app-nav-item'}
          aria-current={activeSection === item.id ? 'page' : undefined}
          data-testid={`nav-${item.id}`}
          onClick={() => { onSelectSection?.(item.id); closeDrawer() }}
        >
          <span className="app-nav-icon" aria-hidden="true"><Icon size={18} /></span>
          <span className="app-nav-label">{item.label}</span>
          {showBadge ? (
            <span className="app-nav-badge" data-testid="nav-unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </li>
    )
  }

  const asideClass = [
    'sidebar',
    'app-nav',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'is-mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <aside
      id="app-primary-nav"
      className={asideClass}
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
        <button
          type="button"
          className="app-nav-close"
          data-testid="mobile-nav-close"
          aria-label="Close menu"
          onClick={closeDrawer}
        >
          <CloseIcon size={20} />
        </button>
      </div>

      <button
        type="button"
        className="app-nav-search"
        data-testid="sidebar-search"
        onClick={() => { onOpenSearch?.(); closeDrawer() }}
      >
        <span className="app-nav-icon" aria-hidden="true"><SearchIcon size={16} /></span>
        <span className="app-nav-search-label">Search</span>
        <kbd className="app-nav-kbd" aria-hidden="true">Ctrl K</kbd>
      </button>

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
              onClick={() => { onSelectBoard?.(item.id); closeDrawer() }}
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
          onClick={() => { onCreateBoard?.(); closeDrawer() }}
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
              onClick={() => { setCurrentProjectId(item.id); closeDrawer() }}
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
          onClick={() => { onSelectSection?.('projects'); closeDrawer() }}
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
