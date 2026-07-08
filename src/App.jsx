import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { supabase, formatSupabaseError, isMissingColumnError } from './lib/supabase'
import ProjectSidebar from './components/ProjectSidebar'
import ProjectHeader from './components/ProjectHeader'
import TaskBoard from './components/TaskBoard'
import DetailsPanel from './components/DetailsPanel'
import TaskModal from './components/TaskModal'
import TasksView from './components/TasksView'
import CalendarView from './components/CalendarView'
import ReportsView from './components/ReportsView'
import {
  createActivity,
  defaultProjects,
  defaultTasks,
  defaultTeamMembers,
  defaultTheme,
  disciplines,
  FALLBACK_STATUS,
  gameCategories,
  labelPool,
  methodologies,
  priorities,
  resolveSections,
  slugifySection,
} from './data/defaultData'
import { buildInviteUrl, siteUrl } from './lib/site'

// board_invites uses owner/admin/member; board_members uses owner/editor/viewer.
const inviteRoleToMemberRole = (role) =>
  ({ owner: 'owner', admin: 'editor', member: 'viewer' })[role] ?? 'viewer'

const emptyTaskForm = {
  title: '',
  description: '',
  discipline: 'Programming',
  priority: 'Medium',
  assignee: 'Unassigned',
  sprint: 'Next Sprint',
  estimate: '1 pt',
  due: '',
}

const emptyProjectForm = {
  name: '',
  tagline: '',
  category: 'Educational',
  methodology: 'Agile Sprint',
}

const clampAssignee = (assignee, teamMembers) =>
  teamMembers.includes(assignee) ? assignee : 'Unassigned'

function MarketingHome({ openLogin, openSignup }) {
  return (
    <main className="marketing-shell">
      <section className="marketing-hero panel">
        <div className="marketing-logo-wrap" aria-hidden="true">
          <div className="marketing-logo-glow" />
          <div className="marketing-logo-mark">🔥</div>
        </div>

        <p className="eyebrow">Game production, organized</p>
        <h1 className="inferno-wordmark">Inferno</h1>
        <p className="marketing-subcopy">
          A free game design task board for planning features, assigning work, tracking production, and
          keeping your team aligned from backlog to final polish.
        </p>

        <div className="marketing-cta-row">
          <button type="button" className="primary-btn" data-testid="hero-signup" onClick={openSignup}>
            Sign up free
          </button>
          <button type="button" className="secondary-btn" data-testid="hero-login" onClick={openLogin}>
            Log in
          </button>
        </div>

        <p className="marketing-sample-note">
          New accounts start with a fully seeded sample board — real projects and tasks — so you can explore
          Inferno before adding your own.
        </p>

        <div className="marketing-proof">
          <span>Free to use</span>
          <span>Built for game projects</span>
          <span>Kanban + task details + team planning</span>
        </div>
      </section>

      <section className="marketing-hierarchy panel" aria-label="How Inferno is organized">
        <p className="eyebrow">How it fits together</p>
        <h2>Board → Project → Task</h2>
        <p className="muted-copy">
          Inferno keeps production organized with a simple, predictable hierarchy.
        </p>
        <div className="hierarchy-flow">
          <article className="hierarchy-node">
            <span className="hierarchy-step">Board</span>
            <p>Your studio workspace — one shared home for a game or team, with chat and invites built in.</p>
          </article>
          <span className="hierarchy-arrow" aria-hidden="true">→</span>
          <article className="hierarchy-node">
            <span className="hierarchy-step">Project</span>
            <p>A feature area, milestone, or game inside the board. Switch between projects from the sidebar.</p>
          </article>
          <span className="hierarchy-arrow" aria-hidden="true">→</span>
          <article className="hierarchy-node">
            <span className="hierarchy-step">Task</span>
            <p>The actual work — design, art, code, audio, polish — moving across a Kanban pipeline.</p>
          </article>
        </div>
      </section>

      <section className="marketing-features">
        <article className="panel marketing-feature-card">
          <h2>Plan your pipeline</h2>
          <p className="muted-copy">
            Move tasks across backlog, active production, review, and done with a board designed for game workflows.
          </p>
        </article>

        <article className="panel marketing-feature-card">
          <h2>Track real task details</h2>
          <p className="muted-copy">
            Capture assignees, discipline, estimate, due dates, subtasks, and production notes without leaving the board.
          </p>
        </article>

        <article className="panel marketing-feature-card">
          <h2>Keep the team aligned</h2>
          <p className="muted-copy">
            Organize teammates, project labels, and project-level activity in one place so progress stays visible.
          </p>
        </article>
      </section>

      <section className="marketing-about panel" aria-label="About Inferno">
        <p className="eyebrow">About Inferno</p>
        <h2>A production board designed around how games actually get made</h2>
        <p className="muted-copy">
          Most task tools are built for generic software teams. Inferno is opinionated about game
          development: disciplines like design, combat, audio, and polish are first-class, tasks carry
          the estimates and sprint context producers care about, and the whole board reads like a
          pipeline instead of a spreadsheet.
        </p>
        <div className="about-highlights">
          <div className="about-highlight">
            <h3>The problem</h3>
            <p>Small studios juggle planning docs, chat apps, and spreadsheets — context scatters and work stalls.</p>
          </div>
          <div className="about-highlight">
            <h3>The approach</h3>
            <p>One dark, focused board that unifies tasks, discussion, and team planning around a clear Board → Project → Task model.</p>
          </div>
          <div className="about-highlight">
            <h3>The outcome</h3>
            <p>Everyone sees the same pipeline, decisions live next to the work, and momentum stays visible from backlog to ship.</p>
          </div>
        </div>
      </section>

      <section className="marketing-banner panel">
        <div>
          <p className="eyebrow">Why Inferno</p>
          <h2>Built for indie teams, student projects, and fast-moving prototypes</h2>
          <p className="muted-copy">
            Inferno gives you a lightweight production board without the clutter of a giant studio toolchain.
          </p>
        </div>

        <div className="marketing-cta-row">
          <button type="button" className="primary-btn" data-testid="banner-signup" onClick={openSignup}>
            Create free account
          </button>
          <button type="button" className="secondary-btn" data-testid="banner-login" onClick={openLogin}>
            I already have an account
          </button>
        </div>
      </section>
    </main>
  )
}

function OnboardingGuide({
  boardName,
  projectCount,
  taskCount,
  isExampleBoard,
  onDismiss,
  onFocusCreateTask,
  onScrollToMessages,
  onScrollToInvites,
}) {
  const steps = [
    {
      key: 'board',
      badge: '1',
      title: 'Start with a board',
      body: (
        <>
          A <strong>board</strong> is your studio workspace — one shared home for a game or team.
          {boardName ? (
            <> You are currently working in <strong>{boardName}</strong>.</>
          ) : (
            <> We created your first board automatically so you can dive right in.</>
          )}
          {isExampleBoard ? (
            <> It's pre-filled with an <strong>example board</strong> — sample projects and tasks you can freely edit or delete as you make it your own.</>
          ) : null}
        </>
      ),
    },
    {
      key: 'project',
      badge: '2',
      title: 'Organize work into projects',
      body: (
        <>
          Inside a board, <strong>projects</strong> group related work — a feature area, a milestone,
          or a whole game. Add or switch projects from the left sidebar.
          {projectCount > 0 ? <> You already have {projectCount} to explore.</> : null}
        </>
      ),
    },
    {
      key: 'task',
      badge: '3',
      title: 'Break projects into tasks',
      body: (
        <>
          <strong>Tasks</strong> are the actual work — design, art, code, audio, polish. Create one from
          the quick-create bar, then drag it across the pipeline from Backlog to Done.
          {taskCount > 0 ? <> {taskCount} tasks are already on the board.</> : null}
        </>
      ),
      action: onFocusCreateTask
        ? { label: 'Create a task', testid: 'onboarding-create-task', onClick: onFocusCreateTask }
        : null,
    },
    {
      key: 'messages',
      badge: '4',
      title: 'Talk it through in board chat',
      body: (
        <>
          Use <strong>Team messages</strong> to keep decisions next to the work — no separate tool
          needed. Everyone on the board sees updates in real time.
        </>
      ),
      action: onScrollToMessages
        ? { label: 'Open board chat', testid: 'onboarding-open-chat', onClick: onScrollToMessages }
        : null,
    },
    {
      key: 'invite',
      badge: '5',
      title: 'Invite your collaborators',
      body: (
        <>
          Bring teammates in with an email <strong>invite</strong>. Choose their access level and they
          join the board with the right permissions.
        </>
      ),
      action: onScrollToInvites
        ? { label: 'Invite a teammate', testid: 'onboarding-open-invites', onClick: onScrollToInvites }
        : null,
    },
  ]

  return (
    <section className="onboarding-panel panel" data-testid="onboarding-guide" aria-label="Getting started with Inferno">
      <div className="onboarding-header">
        <div>
          <p className="eyebrow">Getting started</p>
          <div className="onboarding-title-row">
            <h2>Welcome to Inferno — here's how it works</h2>
            {isExampleBoard ? (
              <span className="example-board-badge" data-testid="example-board-badge">
                Example board
              </span>
            ) : null}
          </div>
          <p className="muted-copy">
            Board → Project → Task. Follow these steps to set up your production pipeline in a couple of minutes.
          </p>
          {isExampleBoard ? (
            <p className="onboarding-sample-callout" data-testid="onboarding-sample-callout">
              Everything you see right now is a <strong>sample board</strong> we set up so you can explore.
              Rename it, edit the tasks, or delete them — nothing here is permanent.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="icon-btn"
          data-testid="onboarding-dismiss"
          aria-label="Dismiss getting started guide"
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>

      <div className="onboarding-steps">
        {steps.map((step) => (
          <article key={step.key} className="onboarding-step">
            <span className="onboarding-badge" aria-hidden="true">{step.badge}</span>
            <div className="onboarding-step-body">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {step.action ? (
                <button
                  type="button"
                  className="secondary-btn onboarding-step-action"
                  data-testid={step.action.testid}
                  onClick={step.action.onClick}
                >
                  {step.action.label}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="onboarding-footer">
        <p className="muted-copy">
          <strong>Recommended next step:</strong> create your first real task, then invite one teammate so the board isn't empty.
        </p>
        <button
          type="button"
          className="primary-btn"
          data-testid="onboarding-done"
          onClick={onDismiss}
        >
          Got it, let's build
        </button>
      </div>
    </section>
  )
}

function AuthModal({
  mode,
  form,
  setForm,
  error,
  message,
  loading,
  onClose,
  onSubmit,
  onSwitchMode,
  onForgotPassword,
}) {
  const emailInputRef = useRef(null)

  useEffect(() => {
    if (!mode) return
    emailInputRef.current?.focus()
  }, [mode])

  if (!mode) return null

  return (
    <div className="auth-overlay" onClick={onClose} role="presentation">
      <div
        className="auth-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close auth form"
        >
          ×
        </button>

        <p className="eyebrow">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        <h2 id="auth-title">
          {mode === 'login' ? 'Log in to Inferno' : 'Sign up for Inferno'}
        </h2>

        <form className="auth-form" onSubmit={onSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            ref={emailInputRef}
            id="auth-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            placeholder="you@example.com"
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
            placeholder="Enter your password"
          />

          {mode === 'signup' && (
            <>
              <label htmlFor="auth-confirm-password">Confirm password</label>
              <input
                id="auth-confirm-password"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((c) => ({ ...c, confirmPassword: e.target.value }))
                }
                placeholder="Re-enter your password"
              />
            </>
          )}

          {error ? (
            <p className="auth-error" data-testid="auth-status" role="alert">{error}</p>
          ) : null}
          {message ? (
            <p className="auth-success" data-testid="auth-status" role="status">{message}</p>
          ) : null}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          {mode === 'login' ? (
            <button
              type="button"
              className="auth-forgot-btn"
              data-testid="auth-forgot-password"
              onClick={onForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        <p className="auth-switch-copy">
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState(defaultTeamMembers)
  const [theme, setTheme] = useState(defaultTheme)
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [newTask, setNewTask] = useState(emptyTaskForm)
  const [editingTask, setEditingTask] = useState(null)
  const [newMember, setNewMember] = useState('')
  const [newProject, setNewProject] = useState(emptyProjectForm)
  const quickCreateInputRef = useRef(null)
  const [boards, setBoards] = useState([])
  const [currentBoardId, setCurrentBoardId] = useState(null)
  const [boardMembers, setBoardMembers] = useState([])
  const [profiles, setProfiles] = useState({})
  const currentBoard = boards.find((board) => board.id === currentBoardId) || boards[0]
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const presenceChannelRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingMessageText, setEditingMessageText] = useState('')
  const chatMessagesEndRef = useRef(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [invites, setInvites] = useState([])
  const [sendingInvite, setSendingInvite] = useState(false)
  const [authMode, setAuthMode] = useState(null) // null | 'login' | 'signup'
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [myInvites, setMyInvites] = useState([])
  const [acceptingInviteId, setAcceptingInviteId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeSection, setActiveSection] = useState('board')
  const [myProfile, setMyProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    gamer_tag: '',
    pronouns: '',
    avatar_url: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwordResetStatus, setPasswordResetStatus] = useState('idle')
  const [passwordResetMessage, setPasswordResetMessage] = useState('')

  // ── Auth listener ──
useEffect(() => {
  // Check for existing session on mount
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    if (session) {
      loadAllData(session.user.id)
    } else {
      setLoading(false) // No session — show login
    }
  })

  // Listen for sign in / sign out events
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session)
    if (event === 'SIGNED_IN' && session) {
      loadAllData(session.user.id)
    } else if (event === 'SIGNED_OUT') {
      setProjects([])
      setTasks([])
      setTeamMembers(defaultTeamMembers)
      setCurrentProjectId(null)
      setLoading(false)
      setBoards([])
      setBoardMembers([])
      setProfiles({})
      setMyProfile(null)
      setShowOnboarding(false)
      setCurrentBoardId(null)
      setOnlineUsers([])
      setTypingUsers([])
      setMessages([])
      setNewMessage('')
      setSendingMessage(false)
      setEditingMessageId(null)
      setEditingMessageText('')
    }
  })

  return () => subscription.unsubscribe()
}, [])

  // ── Theme CSS vars ──
  useEffect(() => {
    Object.entries({
      '--accent': theme.accent,
      '--accent-secondary': theme.accentSecondary,
      '--surface-custom': theme.surface,
      '--background-custom': theme.background,
    }).forEach(([key, value]) => document.documentElement.style.setProperty(key, value))
  }, [theme])

useEffect(() => {
  if (!session?.user || !currentBoardId) return

  const channel = supabase.channel(`presence:board:${currentBoardId}`, {
    config: {
      presence: { key: session.user.id },
    },
  })

  presenceChannelRef.current = channel

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()

      const users = Object.entries(state).flatMap(([key, presences]) =>
        (presences || []).map((presence) => ({
          key,
          userId: presence.userId ?? key,
          email: presence.email ?? 'Unknown user',
          projectId: presence.projectId ?? null,
          onlineAt: presence.onlineAt ?? null,
        }))
      )

      setOnlineUsers(users)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: session.user.id,
          email: session.user.email,
          projectId: currentProjectId ?? null,
          onlineAt: new Date().toISOString(),
        })
      }
    })

  return () => {
    presenceChannelRef.current = null
    lastTrackedProjectId.current = null
    channel.untrack()
    supabase.removeChannel(channel)
    setOnlineUsers([])
  }
}, [session?.user?.id, session?.user?.email, currentBoardId])

const lastTrackedProjectId = useRef(null)

useEffect(() => {
  const channel = presenceChannelRef.current
  if (!channel || !session?.user || !currentBoardId) return
  if (lastTrackedProjectId.current === currentProjectId) return

  lastTrackedProjectId.current = currentProjectId ?? null

  channel.track({
    userId: session.user.id,
    email: session.user.email,
    projectId: currentProjectId ?? null,
    onlineAt: new Date().toISOString(),
  })
}, [session?.user?.id, session?.user?.email, currentBoardId, currentProjectId])

  // ── Load everything from Supabase ──
  const loadAllData = async (userId, preferredBoardId = null, { background = false } = {}) => {
  // Background refreshes (realtime updates) must not flip the full-screen
  // loading state — doing so unmounts the board and scrolls the page to the top.
  if (!background) setLoading(true)
  setLoadError('')

let { data: membershipRows, error: membershipError } = await supabase
  .from('board_members')
  .select('board_id, role, boards(*)')
  .eq('user_id', userId)

if (membershipError) {
  console.error('Membership load error:', membershipError)
  setLoadError('We could not load your boards. Check your connection and try again.')
  setLoading(false)
  return
}

  if (!membershipRows?.length) {
    const { data: createdBoard, error: boardError } = await supabase
  .from('boards')
  .insert({
    owner_id: userId,
    name: 'My Studio Board',
    description: 'Shared production workspace',
  })
  .select()
  .single()

if (boardError || !createdBoard) {
  console.error('Board creation error:', boardError)
  setLoadError('We could not set up your first board. Please try again in a moment.')
  setLoading(false)
  return
}

const { error: memberInsertError } = await supabase
  .from('board_members')
  .insert([{
    board_id: createdBoard.id,
    user_id: userId,
    role: 'owner',
  }])

if (memberInsertError) {
  console.error('Board member creation error:', memberInsertError)
  setLoadError('We could not finish setting up your board membership. Please try again.')
  setLoading(false)
  return
}

    membershipRows = [{
      board_id: createdBoard.id,
      role: 'owner',
      boards: createdBoard,
    }]
  }

  const loadedBoards = membershipRows.map((row) => row.boards).filter(Boolean)

  const activeBoardId =
    loadedBoards.find((board) => board.id === preferredBoardId)?.id ??
    loadedBoards.find((board) => board.id === currentBoardId)?.id ??
    loadedBoards[0]?.id ??
    null

setBoards(loadedBoards)
setCurrentBoardId(activeBoardId)

    if (!activeBoardId) {
        setProjects([])
        setTasks([])
        setBoardMembers([])
        setLoading(false)
        setMessages([])
  return
}

  const [
  { data: projectData },
  { data: taskData },
  { data: memberData },
  { data: boardMemberRows },
  { data: messageData },
  { data: inviteData },
] = await Promise.all([
  supabase.from('projects').select('*').eq('board_id', activeBoardId).order('created_at'),
  supabase
    .from('tasks')
    .select('*, projects!inner(board_id)')
    .eq('projects.board_id', activeBoardId)
    .order('sort_order'),
  supabase.from('team_members').select('*').eq('board_id', activeBoardId),
  supabase.from('board_members').select('*').eq('board_id', activeBoardId),
  supabase
    .from('board_messages')
    .select('*')
    .eq('board_id', activeBoardId)
    .order('created_at', { ascending: true })
    .limit(100),
  supabase
    .from('board_invites')
    .select('*')
    .eq('board_id', activeBoardId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false }),
])


  const loadedProjects = projectData?.length ? projectData.map(dbToProject) : []
  const loadedTasks = taskData?.length ? taskData.map(dbToTask) : []
  const loadedMembers = memberData?.length ? memberData.map((m) => m.name) : defaultTeamMembers
  const loadedMessages = messageData?.length ? messageData.map(dbToMessage) : []
  const loadedInvites = inviteData?.length ? inviteData.map(dbToInvite) : []
  setInvites(loadedInvites)

  let nextProjects = []
  let nextTasks = []

  if (!projectData?.length) {
    await seedDefaults(userId, activeBoardId)

    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from('projects').select('*').eq('board_id', activeBoardId).order('created_at'),
      supabase
        .from('tasks')
        .select('*, projects!inner(board_id)')
        .eq('projects.board_id', activeBoardId)
        .order('sort_order'),
    ])

    nextProjects = p?.map(dbToProject) ?? []
    nextTasks = t?.map(dbToTask) ?? []
  } else {
    nextProjects = loadedProjects
    nextTasks = loadedTasks
  }

setProjects(nextProjects)
setTasks(nextTasks)
setCurrentProjectId((currentId) =>
  nextProjects.some((project) => project.id === currentId)
    ? currentId
    : (nextProjects[0]?.id ?? null)
)

  setTeamMembers(loadedMembers)
  setBoardMembers(boardMemberRows ?? [])
  setLoading(false)
  setMessages(loadedMessages)

  const memberIds = [...new Set((boardMemberRows ?? []).map((row) => row.user_id).filter(Boolean))]
  if (memberIds.length) {
    const { data: profileRows, error: profileLoadError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, gamer_tag, pronouns, onboarding_seen_at')
      .in('id', memberIds)

    if (profileLoadError) {
      console.error('Profiles load error:', profileLoadError)
    } else {
      const rows = profileRows ?? []
      setProfiles(
        Object.fromEntries(rows.map((row) => [row.id, row.display_name]))
      )

      const ownProfile = rows.find((row) => row.id === userId) ?? null
      setMyProfile(ownProfile)
      if (!background) {
        setProfileForm({
          display_name: ownProfile?.display_name ?? '',
          gamer_tag: ownProfile?.gamer_tag ?? '',
          pronouns: ownProfile?.pronouns ?? '',
          avatar_url: ownProfile?.avatar_url ?? '',
        })
        setShowOnboarding(!ownProfile?.onboarding_seen_at)
      }
    }
  } else {
    setProfiles({})
  }
}

useEffect(() => {
  if (!session?.user?.id || !currentBoardId) return

  const refresh = () => loadAllData(session.user.id, null, { background: true })

  const projectsChannel = supabase
    .channel(`projects-${currentBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `board_id=eq.${currentBoardId}`,
      },
      refresh
    )
    .subscribe()

  const teamMembersChannel = supabase
    .channel(`team-members-${currentBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `board_id=eq.${currentBoardId}`,
      },
      refresh
    )
    .subscribe()

  const boardMembersChannel = supabase
    .channel(`board-members-${currentBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_members',
        filter: `board_id=eq.${currentBoardId}`,
      },
      refresh
    )
    .subscribe()

  const tasksChannel = supabase
    .channel(`tasks-${currentBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      refresh
    )
    .subscribe()

  return () => {
    supabase.removeChannel(projectsChannel)
    supabase.removeChannel(teamMembersChannel)
    supabase.removeChannel(boardMembersChannel)
    supabase.removeChannel(tasksChannel)
  }
}, [session?.user?.id, currentBoardId])

useEffect(() => {
  if (!currentBoardId) return

  const channel = supabase
    .channel(`board-messages-${currentBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_messages',
        filter: `board_id=eq.${currentBoardId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const nextMessage = dbToMessage(payload.new)
          setMessages((current) =>
            current.some((message) => message.id === nextMessage.id)
              ? current
              : [...current, nextMessage]
          )
        } else if (payload.eventType === 'UPDATE') {
          const updated = dbToMessage(payload.new)
          setMessages((current) =>
            current.map((message) => (message.id === updated.id ? updated : message))
          )
        } else if (payload.eventType === 'DELETE') {
          const removedId = payload.old?.id
          if (!removedId) return
          setMessages((current) => current.filter((message) => message.id !== removedId))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [currentBoardId])

useEffect(() => {
  chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
}, [messages.length])

useEffect(() => {
  const acceptInviteFromUrl = async () => {
    if (!session?.user) return

    const url = new URL(window.location.href)
    const token = url.searchParams.get('invite')
    if (!token) return

    const { data: invite, error } = await supabase
      .from('board_invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (error || !invite) return

    const inviteEmail = invite.email.trim().toLowerCase()
    const userEmail = session.user.email?.trim().toLowerCase()

    if (!userEmail || inviteEmail !== userEmail) {
      window.alert('This invite was sent to a different email address.')
      return
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      window.alert('This invite has expired.')
      return
    }

    const { error: memberError } = await supabase
      .from('board_members')
      .insert([{
        board_id: invite.board_id,
        user_id: session.user.id,
        role: inviteRoleToMemberRole(invite.role),
      }])

    if (memberError && !memberError.message.toLowerCase().includes('duplicate')) {
      console.error('Accept invite membership error:', memberError)
      return
    }

    await supabase
      .from('board_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    url.searchParams.delete('invite')
    window.history.replaceState({}, '', url.toString())

    loadAllData(session.user.id, invite.board_id)
  }

  acceptInviteFromUrl()
}, [session?.user?.id])

useEffect(() => {
  const loadMyInvites = async () => {
    const email = session?.user?.email?.trim().toLowerCase()
    if (!email) {
      setMyInvites([])
      return
    }

    const { data, error } = await supabase
      .from('board_invites')
      .select('*')
      .eq('email', email)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Load my invites error:', error)
      return
    }

    setMyInvites((data ?? []).map(dbToInvite))
  }

  loadMyInvites()
}, [session?.user?.email])

const acceptInvite = async (invite) => {
  if (!session?.user) return

  const userEmail = session.user.email?.trim().toLowerCase()
  const inviteEmail = invite.email?.trim().toLowerCase()

  if (!userEmail || !inviteEmail || userEmail !== inviteEmail) {
    window.alert('This invite was sent to a different email address.')
    return
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    window.alert('This invite has expired.')
    return
  }

  setAcceptingInviteId(invite.id)

  const { error: memberError } = await supabase
    .from('board_members')
    .upsert(
      [{
        board_id: invite.boardId,
        user_id: session.user.id,
        role: inviteRoleToMemberRole(invite.role),
      }],
      { onConflict: 'board_id,user_id' }
    )

  if (memberError) {
    console.error('Accept invite membership error:', memberError)
    setAcceptingInviteId(null)
    return
  }

  const { error: inviteError } = await supabase
    .from('board_invites')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: session.user.id,
    })
    .eq('id', invite.id)
    .is('accepted_at', null)

  if (inviteError) {
    console.error('Accept invite update error:', inviteError)
    setAcceptingInviteId(null)
    return
  }

  setMyInvites((current) => current.filter((item) => item.id !== invite.id))
  await loadAllData(session.user.id, invite.boardId)
  setAcceptingInviteId(null)
}

  // ── Seed default data for new accounts ──
const seedDefaults = async (userId, boardId) => {
  const projectInserts = defaultProjects.map((p) => ({
    user_id: userId,
    board_id: boardId,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    methodology: p.methodology,
    target_platform: p.targetPlatform,
    phase: p.phase,
    pillars: p.pillars ?? [],
    labels: p.labels ?? [],
    activity: p.activity ?? [],
  }))

  const { data: insertedProjects, error: projectError } = await supabase
    .from('projects')
    .insert(projectInserts)
    .select()

  if (projectError) {
    console.error('Project seed error:', projectError)
    return
  }

  // Map old default IDs to the new Supabase-generated IDs
  const idMap = {}
  defaultProjects.forEach((p, i) => {
    if (insertedProjects[i]) idMap[p.id] = insertedProjects[i].id
  })

  // Insert tasks using the new project IDs
  const taskInserts = defaultTasks.map((t, i) => ({
    user_id: userId,
    project_id: idMap[t.projectId] ?? insertedProjects[0].id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    discipline: t.discipline,
    assignee: t.assignee,
    sprint: t.sprint,
    estimate: t.estimate,
    due: t.due,
    completed: t.completed,
    labels: t.labels ?? [],
    subtasks: t.subtasks ?? [],
    activity: t.activity ?? [],
    sort_order: i,
  }))

  const { error: taskError } = await supabase.from('tasks').insert(taskInserts)
  if (taskError) console.error('Task seed error:', taskError)

  const memberInserts = defaultTeamMembers.map((name) => ({
  board_id: boardId,
  name,
}))
  const { error: memberError } = await supabase.from('team_members').insert(memberInserts)
  if (memberError) console.error('Member seed error:', memberError)
}

  // ── Shape converters ──
function dbToProject(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    tagline: row.tagline,
    category: row.category,
    methodology: row.methodology,
    targetPlatform: row.target_platform,
    phase: row.phase,
    pillars: row.pillars ?? [],
    labels: row.labels ?? [],
    activity: row.activity ?? [],
  }
}

function dbToTask(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    discipline: row.discipline,
    assignee: row.assignee,
    sprint: row.sprint,
    estimate: row.estimate,
    due: row.due,
    completed: row.completed,
    labels: row.labels ?? [],
    subtasks: row.subtasks ?? [],
    activity: row.activity ?? [],
  }
}

  const projectToDb = (p, userId) => ({
  id: p.id,
  user_id: userId,
  board_id: p.boardId,
  name: p.name,
  tagline: p.tagline,
  category: p.category,
  methodology: p.methodology,
  target_platform: p.targetPlatform,
  phase: p.phase,
  pillars: p.pillars ?? [],
  labels: p.labels ?? [],
  activity: p.activity ?? [],
})

  const taskToDb = (t, userId, order = 0) => ({
    id: t.id,
    user_id: userId,
    project_id: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    discipline: t.discipline,
    assignee: t.assignee,
    sprint: t.sprint,
    estimate: t.estimate,
    due: t.due,
    completed: t.completed,
    labels: t.labels ?? [],
    subtasks: t.subtasks ?? [],
    activity: t.activity ?? [],
    sort_order: order,
  })

  function dbToMessage(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    userId: row.user_id,
    text: row.message,
    createdAt: row.created_at,
    editedAt: row.updated_at ?? null,
  }
}

function dbToInvite(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    email: row.email,
    role: row.role,
    token: row.token,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
  }
}
  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0]
  const userId = session?.user?.id

  // Heuristic: the seeded starter board still contains its original sample
  // projects. Used to clearly label seeded data as an example board.
  const isExampleBoard = useMemo(() => {
    if (!projects.length) return false
    const seededNames = new Set(defaultProjects.map((p) => p.name.toLowerCase()))
    return projects.some((p) => p.name && seededNames.has(p.name.toLowerCase()))
  }, [projects])

  // ── Kanban sections (board-level columns) ──
  const sections = useMemo(
    () => resolveSections(currentBoard?.kanban_sections, tasks),
    [currentBoard, tasks]
  )

  const persistSections = async (nextSections) => {
    if (!currentBoardId) return
    setBoards((current) =>
      current.map((board) =>
        board.id === currentBoardId ? { ...board, kanban_sections: nextSections } : board
      )
    )
    const { error } = await supabase
      .from('boards')
      .update({ kanban_sections: nextSections })
      .eq('id', currentBoardId)
    if (error) console.error('Persist sections error:', error)
  }

  const addSection = async (label) => {
    const name = (label ?? '').trim()
    if (!name || name.length > 40) return
    if (sections.some((section) => section.label.toLowerCase() === name.toLowerCase())) return
    const id = slugifySection(name, sections.map((section) => section.id))
    await persistSections([...sections, { id, label: name }])
  }

  const removeSection = async (sectionId) => {
    if (sections.length <= 1) return
    const section = sections.find((item) => item.id === sectionId)
    const remaining = sections.filter((item) => item.id !== sectionId)
    const fallbackId = remaining.find((item) => item.id === FALLBACK_STATUS)?.id ?? remaining[0].id
    const fallbackLabel = remaining.find((item) => item.id === fallbackId)?.label ?? fallbackId
    const affected = tasks.filter((task) => task.status === sectionId)

    const confirmed = window.confirm(
      affected.length
        ? `Remove the "${section?.label}" section? Its ${affected.length} task${affected.length === 1 ? '' : 's'} will move to "${fallbackLabel}".`
        : `Remove the "${section?.label}" section?`
    )
    if (!confirmed) return

    if (affected.length) {
      const completed = fallbackId === 'done'
      setTasks((current) =>
        current.map((task) =>
          task.status === sectionId ? { ...task, status: fallbackId, completed } : task
        )
      )
      const { error } = await supabase
        .from('tasks')
        .update({ status: fallbackId, completed })
        .in('id', affected.map((task) => task.id))
      if (error) console.error('Reassign tasks on section removal error:', error)
    }

    await persistSections(remaining)
  }

  // ── Filtered tasks ──
  const filteredTasks = useMemo(() => {
    if (!currentProject) return []
    return tasks.filter((task) => {
      const projectMatch = task.projectId === currentProject.id
      const disciplineMatch = filter === 'All' || task.discipline === filter
      const searchMatch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase()) ||
        task.assignee.toLowerCase().includes(search.toLowerCase())
      return projectMatch && disciplineMatch && searchMatch
    })
  }, [tasks, currentProject, filter, search])

  const stats = useMemo(() => ({
    done: tasks.filter((t) => t.completed).length,
    inFlight: tasks.filter((t) => ['inprogress', 'review'].includes(t.status) && !t.completed).length,
    projects: projects.length,
  }), [tasks, projects])

  // ── Project actions ──
  const logProjectActivity = (projectId, type, text) => {
    setProjects((current) =>
      current.map((p) => p.id === projectId
        ? { ...p, activity: [createActivity(type, text), ...(p.activity || [])] }
        : p
      )
    )
  }

  const updateProjectField = (field, value) => {
    setProjects((current) =>
      current.map((p) => p.id === currentProject.id ? { ...p, [field]: value } : p)
    )
    logProjectActivity(currentProject.id, 'settings', `Updated project ${field}.`)
    supabase.from('projects').update({ [field === 'targetPlatform' ? 'target_platform' : field]: value })
      .eq('id', currentProject.id).then()
  }

  const createProject = async (event) => {
    event.preventDefault()
    if (!newProject.name.trim()) return
    if (newProject.name.length > 100) return
    const project = {
      id: crypto.randomUUID(),
      boardId: currentBoardId,
      name: newProject.name.trim(),
      tagline: newProject.tagline.trim() || 'New game project ready for planning.',
      category: newProject.category,
      methodology: newProject.methodology,
      targetPlatform: 'PC',
      phase: 'Pre-production',
      pillars: ['Clear fantasy', 'Scoped systems', 'Playtest-driven iteration'],
      labels: ['UI', 'Playtest'],
      activity: [createActivity('project', `Created project ${newProject.name.trim()}.`)],
    }
    setProjects((current) => [project, ...current])
    setCurrentProjectId(project.id)
    setNewProject(emptyProjectForm)
    await supabase.from('projects').insert([projectToDb(project, userId)])
  }

  const deleteProject = async (projectId) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project || projects.length <= 1) return
    const confirmed = window.confirm(`Delete project "${project.name}" and all of its tasks?`)
    if (!confirmed) return
    const remaining = projects.filter((p) => p.id !== projectId)
    setProjects(remaining)
    setTasks((current) => current.filter((t) => t.projectId !== projectId))
    if (currentProjectId === projectId) setCurrentProjectId(remaining[0].id)
    await supabase.from('projects').delete().eq('id', projectId)
  }

  // ── Task actions ──
  const updateTask = async (taskId, updates) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task
        const next = { ...task, ...updates }
        if (next.completed) next.status = 'done'
        if (!next.completed && next.status === 'done') next.status = 'todo'
        next.activity = [createActivity('update', 'Updated task details.'), ...(next.activity || [])]
        return next
      })
    )
    const { subtasks, labels, activity, projectId, ...rest } = updates
    await supabase.from('tasks').update({
      ...rest,
      ...(subtasks !== undefined && { subtasks }),
      ...(labels !== undefined && { labels }),
      ...(activity !== undefined && { activity }),
      ...(projectId !== undefined && { project_id: projectId }),
    }).eq('id', taskId)
  }

  const deleteTask = async (taskId) => {
    const removed = tasks.find((t) => t.id === taskId)
    setTasks((current) => current.filter((t) => t.id !== taskId))
    if (removed) logProjectActivity(removed.projectId, 'delete', `Deleted task ${removed.title}.`)
    setEditingTask((current) => (current?.id === taskId ? null : current))
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  const moveTask = async (taskId, nextStatus) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatus, completed: nextStatus === 'done', activity: [createActivity('status', `Moved task to ${nextStatus}.`), ...(task.activity || [])] }
          : task
      )
    )
    await supabase.from('tasks').update({ status: nextStatus, completed: nextStatus === 'done' }).eq('id', taskId)
  }

  const shiftTask = (taskId, direction) => {
    setTasks((current) => {
      const task = current.find((item) => item.id === taskId)
      if (!task) return current
      const sameProject = current.filter((item) => item.projectId === task.projectId)
      const siblings = sameProject.filter((item) => item.status === task.status)
      const index = siblings.findIndex((item) => item.id === taskId)
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= siblings.length) return current
      const reordered = [...siblings]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)
      const otherProjectTasks = current.filter((item) => item.projectId !== task.projectId)
      const sameWithoutColumn = sameProject.filter((item) => item.status !== task.status)
      return [...otherProjectTasks, ...sameWithoutColumn, ...reordered]
    })
  }

  const handleCreateTask = async (event) => {
    event.preventDefault()
    if (!newTask.title.trim()) return
  if (newTask.title.length > 200) return
  if (newTask.description.length > 2000) return
    const task = {
      id: crypto.randomUUID(),
      projectId: currentProject.id,
      title: newTask.title.trim(),
      description: newTask.description.trim() || 'New production task ready for breakdown.',
      status: 'backlog',
      priority: newTask.priority,
      discipline: newTask.discipline,
      assignee: clampAssignee(newTask.assignee, teamMembers),
      sprint: newTask.sprint.trim() || currentProject.phase,
      estimate: newTask.estimate.trim() || '1 pt',
      due: newTask.due.trim() || 'TBD',
      completed: false,
      labels: currentProject.labels?.slice(0, 2) || [],
      subtasks: [],
      activity: [createActivity('task', 'Task created and added to backlog.')],
    }
    setTasks((current) => [task, ...current])
    logProjectActivity(currentProject.id, 'task', `Created task ${task.title}.`)
    setNewTask(emptyTaskForm)
    await supabase.from('tasks').insert([taskToDb(task, userId)])
  }

  const toggleComplete = (task) => {
    updateTask(task.id, {
      completed: !task.completed,
      status: task.completed ? 'todo' : 'done',
      activity: [createActivity('complete', task.completed ? 'Reopened task.' : 'Marked task complete.'), ...(task.activity || [])],
    })
  }

  const handleEditSave = (event) => {
    event.preventDefault()
    if (!editingTask?.title.trim()) return
    updateTask(editingTask.id, {
      ...editingTask,
      assignee: clampAssignee(editingTask.assignee, teamMembers),
      title: editingTask.title.trim(),
      description: editingTask.description.trim(),
      sprint: editingTask.sprint.trim() || currentProject.phase,
      estimate: editingTask.estimate.trim() || '1 pt',
      due: editingTask.due.trim() || 'TBD',
    })
    setEditingTask(null)
  }

  const addSubtaskToEditing = () => {
    setEditingTask((current) => ({
      ...current,
      subtasks: [...(current.subtasks || []), { id: crypto.randomUUID(), title: `New subtask ${current.subtasks.length + 1}`, done: false }],
    }))
  }

  const addTeamMember = async (event) => {
    event.preventDefault()
    const member = newMember.trim()
    if (!member || teamMembers.includes(member)) return
    setTeamMembers((current) => [...current.filter((m) => m !== 'Unassigned'), member, 'Unassigned'])
    setNewMember('')
    await supabase.from('team_members').insert([{
      board_id: currentBoardId,
      name: member,
    }])
  }

  const removeTeamMember = async (member) => {
    if (member === 'Unassigned') return
    setTeamMembers((current) => current.filter((m) => m !== member))
    setTasks((current) => current.map((t) => ({ ...t, assignee: t.assignee === member ? 'Unassigned' : t.assignee })))
    await supabase
    .from('team_members')
    .delete()
    .eq('board_id', currentBoardId)
    .eq('name', member)
  }

  const focusQuickCreate = () => {
  quickCreateInputRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })

  window.setTimeout(() => {
    quickCreateInputRef.current?.focus()
  }, 150)
}

const handleSelectSection = (section) => {
  setActiveSection(section)
  window.scrollTo({ top: 0, behavior: 'auto' })
}

// Onboarding actions now switch to the relevant page instead of scrolling.
const goToCreateTask = () => {
  setActiveSection('board')
  focusQuickCreate()
}

const goToTeam = () => setActiveSection('team')

const openLogin = () => {
  setAuthError('')
  setAuthMessage('')
  setAuthForm({ email: '', password: '', confirmPassword: '' })
  setAuthMode('login')
}

const openSignup = () => {
  setAuthError('')
  setAuthMessage('')
  setAuthForm({ email: '', password: '', confirmPassword: '' })
  setAuthMode('signup')
}

const closeAuthModal = () => {
  if (authLoading) return
  setAuthMode(null)
  setAuthError('')
  setAuthMessage('')
}

const handleAuthSubmit = async (event) => {
  event.preventDefault()
  setAuthError('')
  setAuthMessage('')

  const email = authForm.email.trim()
  const password = authForm.password.trim()

  if (!email) return setAuthError('Enter your email.')
  if (!password) return setAuthError('Enter your password.')

  if (authMode === 'signup') {
    if (password.length < 6) return setAuthError('Password must be at least 6 characters.')
    if (password !== authForm.confirmPassword.trim()) {
      return setAuthError('Passwords do not match.')
    }
  }

  setAuthLoading(true)

  try {
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setAuthMode(null)
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${siteUrl}/` },
      })
      if (error) throw error
      setAuthMessage('Account created. Check your email if confirmation is enabled.')
    }
  } catch (error) {
    setAuthError(error.message || 'Something went wrong.')
  } finally {
    setAuthLoading(false)
  }
}

const handleForgotPassword = async () => {
  setAuthError('')
  setAuthMessage('')

  const email = authForm.email.trim()
  if (!email) return setAuthError('Enter your email above, then select “Forgot password?” to get a reset link.')

  setAuthLoading(true)

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/`,
    })
    if (error) throw error
    setAuthMessage(`Password reset email sent to ${email}. Check your inbox for the reset link.`)
  } catch (error) {
    setAuthError(error.message || 'We could not send the reset email. Please try again.')
  } finally {
    setAuthLoading(false)
  }
}

const sendMessage = async (event) => {
  event.preventDefault()

  const body = newMessage.trim()
  if (!body || !currentBoardId || !userId || sendingMessage) return
  if (body.length > 2000) return

  setSendingMessage(true)

  const { data, error } = await supabase
    .from('board_messages')
    .insert({
      board_id: currentBoardId,
      user_id: userId,
      message: body, 
    })
    .select()
    .single()

  if (error) {
    console.error('Send message error:', error)
    setSendingMessage(false)
    return
  }

  if (data) {
    const nextMessage = dbToMessage(data)
    setMessages((current) => {
      if (current.some((message) => message.id === nextMessage.id)) return current
      return [...current, nextMessage]
    })
  }

  setNewMessage('')
  setSendingMessage(false)
}

const getMessageAuthorLabel = (message) => {
  if (message.userId === userId) return 'You'

  const displayName = profiles[message.userId]
  if (displayName) return displayName

  return message.userId ? `${message.userId.slice(0, 8)}…` : 'Unknown user'
}

const startEditingMessage = (message) => {
  setEditingMessageId(message.id)
  setEditingMessageText(message.text)
}

const cancelEditingMessage = () => {
  setEditingMessageId(null)
  setEditingMessageText('')
}

const saveEditedMessage = async (event) => {
  event.preventDefault()

  const body = editingMessageText.trim()
  const target = messages.find((message) => message.id === editingMessageId)
  if (!target) return cancelEditingMessage()
  if (!body || body.length > 2000) return
  if (body === target.text) return cancelEditingMessage()

  const previous = messages
  setMessages((current) =>
    current.map((message) =>
      message.id === target.id ? { ...message, text: body } : message
    )
  )
  cancelEditingMessage()

  const { error } = await supabase
    .from('board_messages')
    .update({ message: body })
    .eq('id', target.id)
    .eq('user_id', userId)

  if (error) {
    console.error('Edit message error:', error)
    setMessages(previous)
  }
}

const deleteMessage = async (message) => {
  if (message.userId !== userId) return
  if (!window.confirm('Delete this message?')) return

  const previous = messages
  setMessages((current) => current.filter((item) => item.id !== message.id))
  if (editingMessageId === message.id) cancelEditingMessage()

  const { error } = await supabase
    .from('board_messages')
    .delete()
    .eq('id', message.id)
    .eq('user_id', userId)

  if (error) {
    console.error('Delete message error:', error)
    setMessages(previous)
  }
}

const createInvite = async (event) => {
  event.preventDefault()

  const email = inviteEmail.trim().toLowerCase()
  if (!email || !currentBoardId || !userId || sendingInvite) return

  setSendingInvite(true)

  try {
    const { data, error } = await supabase
      .from('board_invites')
      .insert([{
        board_id: currentBoardId,
        email,
        role: inviteRole,
        invited_by: userId,
      }])
      .select()
      .single()

    if (error) {
      console.error('Invite error:', error)
      return
    }

    const invite = dbToInvite(data)
    const acceptUrl = buildInviteUrl(invite.token)

    setInvites((current) => [invite, ...current])
    setInviteEmail('')
    setInviteRole('member')

    try {
      await navigator.clipboard.writeText(acceptUrl)
    } catch (clipboardError) {
      console.error('Clipboard error:', clipboardError)
    }

    try {
      const { error: emailError } = await supabase.functions.invoke('send-board-invite', {
        body: {
          email: invite.email,
          role: invite.role,
          acceptUrl,
          boardId: invite.boardId,
        },
      })

      if (emailError) {
        console.error('Send invite email error:', emailError)
      }
    } catch (functionError) {
      console.error('Function invoke error:', functionError)
    }
  } finally {
    setSendingInvite(false)
  }
}

const deleteInvite = async (invite) => {
  if (!invite?.id) return
  if (!window.confirm(`Cancel the pending invite for ${invite.email}?`)) return

  const previous = invites
  setInvites((current) => current.filter((item) => item.id !== invite.id))

  const { error } = await supabase
    .from('board_invites')
    .delete()
    .eq('id', invite.id)
    .is('accepted_at', null)

  if (error) {
    console.error('Delete invite error:', error)
    setInvites(previous)
    window.alert('We could not cancel that invite. Please try again.')
  }
}

const dismissOnboarding = async () => {
  setShowOnboarding(false)
  if (!userId) return

  const seenAt = new Date().toISOString()
  setMyProfile((current) => ({ ...(current ?? { id: userId }), onboarding_seen_at: seenAt }))

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, onboarding_seen_at: seenAt }, { onConflict: 'id' })

  // The guide is already hidden locally; a persistence failure should not
  // break the app. Log a readable reason so a missing migration is obvious.
  if (error) console.error('Dismiss onboarding error:', formatSupabaseError(error), error)
}

const updateProfileField = (field, value) => {
  setProfileSaved(false)
  setProfileError('')
  setProfileForm((current) => ({ ...current, [field]: value }))
}

const saveProfile = async (event) => {
  event.preventDefault()
  if (!userId || savingProfile) return

  setSavingProfile(true)
  setProfileSaved(false)
  setProfileError('')

  // Only send known columns. Blank inputs become null rather than empty
  // strings, and we never send undefined.
  const payload = {
    id: userId,
    display_name: profileForm.display_name.trim() || null,
    gamer_tag: profileForm.gamer_tag.trim() || null,
    pronouns: profileForm.pronouns.trim() || null,
    avatar_url: profileForm.avatar_url.trim() || null,
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, display_name, avatar_url, gamer_tag, pronouns, onboarding_seen_at')
    .single()

  if (error) {
    console.error('Save profile error:', formatSupabaseError(error), error)
    if (isMissingColumnError(error)) {
      setProfileError(
        'Your profile database is missing the new profile columns. Apply the ' +
        'latest Supabase migrations, then try again — from the project root run ' +
        '`supabase db push` (linking first with `supabase link --project-ref <ref>` ' +
        'if the project is not linked yet). See README “Database migrations”.'
      )
    } else {
      setProfileError(`We could not save your profile. ${formatSupabaseError(error)}`)
    }
  } else {
    const saved = data ?? payload
    setMyProfile((current) => ({ ...(current ?? {}), ...saved }))
    setProfiles((current) => ({ ...current, [userId]: saved.display_name }))
    setProfileSaved(true)
  }

  setSavingProfile(false)
}

const sendPasswordReset = async () => {
  const email = session?.user?.email
  if (!email || passwordResetStatus === 'sending') return

  setPasswordResetStatus('sending')
  setPasswordResetMessage('')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/`,
  })

  if (error) {
    setPasswordResetStatus('error')
    setPasswordResetMessage(`We could not send the reset email. ${formatSupabaseError(error)}`)
  } else {
    setPasswordResetStatus('sent')
    setPasswordResetMessage(`Password reset email sent to ${email}. Check your inbox.`)
  }
}

if (loading) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#aeb8dd' }}>
      Loading your board…
    </div>
  )
}

// Error fallback: data load failed for a signed-in user
if (!loading && session && loadError) {
  return (
    <div className="load-error-shell" data-testid="load-error">
      <section className="panel load-error-card">
        <div className="load-error-mark" aria-hidden="true">⚠</div>
        <p className="eyebrow">Something went wrong</p>
        <h2>We hit a snag loading your board</h2>
        <p className="muted-copy">{loadError}</p>
        <div className="marketing-cta-row">
          <button
            type="button"
            className="primary-btn"
            data-testid="load-error-retry"
            onClick={() => userId && loadAllData(userId, currentBoardId)}
          >
            Try again
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}

// Guard: if auth is done but projects haven't resolved yet
if (!loading && session && !currentProject) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#aeb8dd' }}>
      Setting up your board…
    </div>
  )
}

if (!loading && !session) {
  return (
    <>
      <MarketingHome
        openLogin={openLogin}
        openSignup={openSignup}
      />
      <AuthModal
        mode={authMode}
        form={authForm}
        setForm={setAuthForm}
        error={authError}
        message={authMessage}
        loading={authLoading}
        onClose={closeAuthModal}
        onSubmit={handleAuthSubmit}
        onSwitchMode={setAuthMode}
        onForgotPassword={handleForgotPassword}
      />
    </>
  )
}

const pendingInvitesPanel =
  session && myInvites.length > 0 ? (
    <section className="panel pending-invites-panel">
      <div className="pending-invites-header">
        <p className="eyebrow">Invitations</p>
        <h3>Pending board invites</h3>
      </div>

      <div className="pending-invites-list">
        {myInvites.map((invite) => (
          <article key={invite.id} className="pending-invite-row">
            <div>
              <strong>{invite.email}</strong>
              <p>{invite.role} access</p>
            </div>

            <button
              type="button"
              className="primary-btn"
              disabled={acceptingInviteId === invite.id}
              onClick={() => acceptInvite(invite)}
            >
              {acceptingInviteId === invite.id ? 'Accepting…' : 'Accept invite'}
            </button>
          </article>
        ))}
      </div>
    </section>
  ) : null

return (
  <>
    {pendingInvitesPanel}
    <div className="app-shell">
      <ProjectSidebar
        stats={stats}
        project={currentProject}
        projects={projects}
        setCurrentProjectId={setCurrentProjectId}
        onSignOut={() => supabase.auth.signOut()}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        userEmail={session?.user?.email}
        profile={myProfile}
      />
      <main className="board-area" data-testid={`view-${activeSection}`}>
        {activeSection === 'board' ? (
          showOnboarding ? (
            <OnboardingGuide
              boardName={currentBoard?.name}
              projectCount={projects.length}
              taskCount={tasks.length}
              isExampleBoard={isExampleBoard}
              onDismiss={dismissOnboarding}
              onFocusCreateTask={goToCreateTask}
              onScrollToMessages={goToTeam}
              onScrollToInvites={goToTeam}
            />
          ) : (
            <div className="onboarding-reopen-row">
              {isExampleBoard ? (
                <span className="example-board-badge" data-testid="example-board-badge-collapsed">
                  Example board
                </span>
              ) : null}
              <button
                type="button"
                className="secondary-btn onboarding-reopen"
                data-testid="onboarding-reopen"
                onClick={() => setShowOnboarding(true)}
              >
                Getting started guide
              </button>
            </div>
          )
        ) : null}

        {activeSection === 'board' ? (
          <>
            <section className="toolbar panel">
              <form className="toolbar-group" onSubmit={handleCreateTask}>
                <input
                  className="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks or assignees"
                />
                <div className="filter-chips">
                  {['All', ...disciplines].map((item) => (
                    <button
                      key={item}
                      className={filter === item ? 'chip active' : 'chip'}
                      onClick={() => setFilter(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="quick-create-grid">
                  <input
                    ref={quickCreateInputRef}
                    data-testid="quick-create-input"
                    value={newTask.title}
                    onChange={(e) => setNewTask((c) => ({ ...c, title: e.target.value }))}
                    placeholder="Add a new feature or task"
                  />
                  <select
                    value={newTask.assignee}
                    onChange={(e) => setNewTask((c) => ({ ...c, assignee: e.target.value }))}
                  >
                    {teamMembers.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <select
                    value={newTask.discipline}
                    onChange={(e) => setNewTask((c) => ({ ...c, discipline: e.target.value }))}
                  >
                    {disciplines.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <button type="submit" className="primary-btn">Create task</button>
                </div>
                <div className="presence-strip">
                <span className="presence-label">
                  Online now ({onlineUsers.length})
                </span>

                <div className="presence-list">
                  {onlineUsers.map((user) => {
                    const activeProject = projects.find((p) => p.id === user.projectId)

                    return (
                      <div
                        key={`${user.userId}-${user.onlineAt ?? 'now'}`}
                        className="presence-pill"
                        title={
                          activeProject
                            ? `${user.email} · Viewing ${activeProject.name}`
                            : user.email
                        }
                      >
                        <span className="presence-dot" />
                        <span className="presence-name">
                          {user.email === session?.user?.email ? 'You' : user.email}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              </form>
            </section>
            <div className="board-scroll-region" data-testid="board-section">
              <TaskBoard
                columns={sections}
                tasks={filteredTasks}
                teamMembers={teamMembers}
                updateTask={updateTask}
                toggleComplete={toggleComplete}
                deleteTask={deleteTask}
                shiftTask={shiftTask}
                setEditingTask={setEditingTask}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
                moveTask={moveTask}
                onCreateFirstTask={focusQuickCreate}
                onAddSection={addSection}
                onRemoveSection={removeSection}
              />
            </div>
          </>
        ) : null}

        {activeSection === 'tasks' ? (
          <TasksView
            project={currentProject}
            tasks={filteredTasks}
            sections={sections}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            disciplines={disciplines}
            onOpenTask={setEditingTask}
            toggleComplete={toggleComplete}
            deleteTask={deleteTask}
            onCreateTask={goToCreateTask}
          />
        ) : null}

        {activeSection === 'projects' ? (
          <section className="projects-view" data-testid="projects-view" aria-label="Projects">
            <header className="view-header">
              <div>
                <p className="eyebrow">Workspace</p>
                <h1>Projects</h1>
                <p className="muted-copy">
                  Switch between projects, edit the active one, or spin up a new game project.
                </p>
              </div>
            </header>

            <div className="projects-grid" data-testid="projects-grid">
              {projects.map((item) => (
                <article
                  key={item.id}
                  className={item.id === currentProject.id ? 'project-card active' : 'project-card'}
                  data-testid={`project-card-${item.id}`}
                >
                  <button
                    type="button"
                    className="project-card-select"
                    aria-current={item.id === currentProject.id ? 'true' : undefined}
                    onClick={() => setCurrentProjectId(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span className="project-card-tagline">{item.tagline}</span>
                    <span className="project-card-meta">
                      {item.methodology} · {item.phase}
                    </span>
                  </button>
                  {projects.length > 1 ? (
                    <button
                      type="button"
                      className="chip-action danger project-card-delete"
                      onClick={() => deleteProject(item.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="panel new-project-panel">
              <div className="section-heading">
                <h2>New project</h2>
              </div>
              <form className="team-form" onSubmit={createProject}>
                <input
                  value={newProject.name}
                  onChange={(e) => setNewProject((c) => ({ ...c, name: e.target.value }))}
                  placeholder="New project name"
                />
                <input
                  value={newProject.tagline}
                  onChange={(e) => setNewProject((c) => ({ ...c, tagline: e.target.value }))}
                  placeholder="Short tagline"
                />
                <div className="form-row">
                  <select
                    value={newProject.category}
                    onChange={(e) => setNewProject((c) => ({ ...c, category: e.target.value }))}
                  >
                    {gameCategories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <select
                    value={newProject.methodology}
                    onChange={(e) => setNewProject((c) => ({ ...c, methodology: e.target.value }))}
                  >
                    {methodologies.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <button type="submit" className="primary-btn" data-testid="create-project">
                  Create project
                </button>
              </form>
            </div>

            <ProjectHeader
              project={currentProject}
              updateProjectField={updateProjectField}
              methodologies={methodologies}
              gameCategories={gameCategories}
              deleteProject={deleteProject}
            />
            <DetailsPanel project={currentProject} tasks={tasks} labelPool={labelPool} />
          </section>
        ) : null}

        {activeSection === 'calendar' ? (
          <CalendarView tasks={tasks} projects={projects} onOpenTask={setEditingTask} />
        ) : null}

        {activeSection === 'reports' ? (
          <ReportsView
            tasks={tasks}
            projects={projects}
            sections={sections}
            priorities={priorities}
            disciplines={disciplines}
          />
        ) : null}

        {activeSection === 'settings' ? (
          <section className="settings-view" data-testid="settings-view" aria-label="Settings">
            <header className="view-header">
              <div>
                <p className="eyebrow">Preferences</p>
                <h1>Settings</h1>
                <p className="muted-copy">Board information, appearance, and your account.</p>
              </div>
            </header>

            <div className="panel settings-panel" data-testid="settings-board">
              <div className="section-heading">
                <h2>Board</h2>
              </div>
              <dl className="settings-list">
                <div>
                  <dt>Board name</dt>
                  <dd>{currentBoard?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Projects</dt>
                  <dd>{projects.length}</dd>
                </div>
                <div>
                  <dt>Team members</dt>
                  <dd>{teamMembers.filter((m) => m !== 'Unassigned').length}</dd>
                </div>
              </dl>
              <p className="muted-copy">
                Pipeline sections are managed from the Board page. Add or remove columns there and they
                apply across every project on this board.
              </p>
            </div>

            <div className="panel settings-panel" data-testid="settings-theme">
              <div className="section-heading">
                <h2>Appearance</h2>
              </div>
              <p className="muted-copy">
                Tap a color to customize the board. Each swatch shows the current color.
              </p>
              <div className="theme-swatch-row" data-testid="theme-swatches">
                {[
                  { key: 'accent', label: 'Accent' },
                  { key: 'accentSecondary', label: 'Glow' },
                  { key: 'surface', label: 'Surface' },
                  { key: 'background', label: 'Background' },
                ].map(({ key, label }) => (
                  <label key={key} className="theme-swatch">
                    <span className="theme-swatch-circle" style={{ background: theme[key] }}>
                      <input
                        type="color"
                        value={theme[key]}
                        data-testid={`theme-swatch-${key}`}
                        aria-label={`${label} color`}
                        onChange={(e) => setTheme((c) => ({ ...c, [key]: e.target.value }))}
                      />
                    </span>
                    <span className="theme-swatch-label">{label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="secondary-btn"
                data-testid="settings-reset-theme"
                onClick={() => setTheme(defaultTheme)}
              >
                Reset to default colors
              </button>
            </div>

            <div className="panel settings-panel" data-testid="settings-profile">
              <div className="section-heading">
                <h2>Profile</h2>
              </div>
              <p className="muted-copy">
                Personalize how you appear to teammates across this board.
              </p>
              <form className="profile-form" onSubmit={saveProfile}>
                <div className="profile-avatar-row">
                  <span className="profile-avatar-preview" aria-hidden="true">
                    {profileForm.avatar_url.trim() ? (
                      <img src={profileForm.avatar_url.trim()} alt="" />
                    ) : (
                      <span className="profile-avatar-fallback">
                        {(profileForm.display_name.trim()[0] ||
                          session?.user?.email?.trim()?.[0] ||
                          'I').toUpperCase()}
                      </span>
                    )}
                  </span>
                  <label className="profile-field profile-field-grow">
                    Profile picture URL
                    <input
                      type="url"
                      value={profileForm.avatar_url}
                      data-testid="profile-avatar-url"
                      maxLength={500}
                      placeholder="https://example.com/avatar.png"
                      onChange={(e) => updateProfileField('avatar_url', e.target.value)}
                    />
                  </label>
                </div>

                <label className="profile-field">
                  Name
                  <input
                    type="text"
                    value={profileForm.display_name}
                    data-testid="profile-display-name"
                    maxLength={80}
                    placeholder="Your name"
                    onChange={(e) => updateProfileField('display_name', e.target.value)}
                  />
                </label>

                <div className="form-row">
                  <label className="profile-field">
                    Gamer tag
                    <input
                      type="text"
                      value={profileForm.gamer_tag}
                      data-testid="profile-gamer-tag"
                      maxLength={60}
                      placeholder="e.g. NightRunner"
                      onChange={(e) => updateProfileField('gamer_tag', e.target.value)}
                    />
                  </label>
                  <label className="profile-field">
                    Pronouns
                    <input
                      type="text"
                      value={profileForm.pronouns}
                      data-testid="profile-pronouns"
                      maxLength={40}
                      placeholder="e.g. she/her"
                      onChange={(e) => updateProfileField('pronouns', e.target.value)}
                    />
                  </label>
                </div>

                {profileError ? <p className="auth-error">{profileError}</p> : null}
                {profileSaved ? (
                  <p className="auth-success" data-testid="profile-saved">Profile saved.</p>
                ) : null}

                <button
                  type="submit"
                  className="primary-btn"
                  data-testid="profile-save"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            </div>

            <div className="panel settings-panel" data-testid="settings-account">
              <div className="section-heading">
                <h2>Account</h2>
              </div>
              <dl className="settings-list">
                <div>
                  <dt>Signed in as</dt>
                  <dd>{session?.user?.email ?? 'Signed in'}</dd>
                </div>
              </dl>

              <div className="settings-security">
                <h3>Password</h3>
                <p className="muted-copy">
                  We'll email you a secure link to choose a new password.
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  data-testid="settings-reset-password"
                  onClick={sendPasswordReset}
                  disabled={passwordResetStatus === 'sending' || !session?.user?.email}
                >
                  {passwordResetStatus === 'sending' ? 'Sending…' : 'Send password reset email'}
                </button>
                {passwordResetMessage ? (
                  <p
                    className={passwordResetStatus === 'error' ? 'auth-error' : 'auth-success'}
                    data-testid="settings-reset-password-status"
                  >
                    {passwordResetMessage}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                className="danger-btn"
                data-testid="settings-sign-out"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </div>
          </section>
        ) : null}

        {activeSection === 'team' ? (
          <section className="team-view" data-testid="team-view" aria-label="Team">
            <header className="view-header">
              <div>
                <p className="eyebrow">Collaboration</p>
                <h1>Team</h1>
                <p className="muted-copy">Manage members, invite collaborators, and talk it through.</p>
              </div>
            </header>

            <div className="panel team-manage-panel" data-testid="team-manage">
              <div className="section-heading">
                <h2>Members</h2>
                <span>{teamMembers.length}</span>
              </div>
              <form onSubmit={addTeamMember} className="team-form">
                <input
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  placeholder="Add team member"
                  aria-label="New team member name"
                />
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

        <section className="chat-panel panel" aria-label="Board chat" data-testid="chat-panel">
  <div className="chat-panel-header">
    <div>
      <p className="eyebrow">Board chat</p>
      <h3>Team messages</h3>
    </div>
    <span className="chat-count">
      {messages.length} {messages.length === 1 ? 'message' : 'messages'}
    </span>
  </div>

  <div className="chat-messages" role="log" aria-live="polite">
    {messages.length ? (
      <>
        {messages.map((message) => {
          const isSelf = message.userId === userId
          const isEditing = editingMessageId === message.id

          return (
            <article
              key={message.id}
              className={isSelf ? 'chat-message self' : 'chat-message'}
            >
              <div className="chat-message-meta">
                <span className="chat-message-author">{getMessageAuthorLabel(message)}</span>
                <span className="chat-message-meta-end">
                  {message.editedAt && message.editedAt !== message.createdAt ? (
                    <span className="chat-edited">edited</span>
                  ) : null}
                  <time dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                </span>
              </div>

              {isEditing ? (
                <form className="chat-edit-form" onSubmit={saveEditedMessage}>
                  <input
                    value={editingMessageText}
                    onChange={(e) => setEditingMessageText(e.target.value)}
                    maxLength={2000}
                    aria-label="Edit message"
                    autoFocus
                  />
                  <div className="chat-edit-actions">
                    <button type="submit" className="secondary-btn chip-action">Save</button>
                    <button
                      type="button"
                      className="secondary-btn chip-action"
                      onClick={cancelEditingMessage}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{message.text}</p>
                  {isSelf ? (
                    <div className="chat-message-actions">
                      <button
                        type="button"
                        className="chat-action-btn"
                        onClick={() => startEditingMessage(message)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="chat-action-btn danger"
                        onClick={() => deleteMessage(message)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          )
        })}
        <div ref={chatMessagesEndRef} />
      </>
    ) : (
      <div className="chat-empty">
        No messages yet. Start the board conversation.
      </div>
    )}
  </div>

  <form className="chat-form" onSubmit={sendMessage}>
    <input
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      placeholder="Send a message to the board"
      aria-label="Message to the board"
      maxLength={2000}
    />
    <button
      type="submit"
      className="primary-btn"
      disabled={sendingMessage || !newMessage.trim()}
    >
      {sendingMessage ? 'Sending…' : 'Send'}
    </button>
  </form>
</section>

<section className="panel invite-panel" aria-label="Invite collaborators" data-testid="invite-panel">
  <div className="invite-panel-header">
    <p className="eyebrow">Invites</p>
    <h3>Invite collaborators</h3>
  </div>

  <form className="invite-form" onSubmit={createInvite}>
    <input
      type="email"
      value={inviteEmail}
      onChange={(e) => setInviteEmail(e.target.value)}
      placeholder="teammate@example.com"
      aria-label="Invite email address"
    />
    <select
      value={inviteRole}
      onChange={(e) => setInviteRole(e.target.value)}
      aria-label="Invite role"
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
    <button
      type="submit"
      className="primary-btn"
      disabled={sendingInvite || !inviteEmail.trim()}
    >
      {sendingInvite ? 'Sending…' : 'Create invite'}
    </button>
  </form>

  <div className="invite-list">
    {invites.length ? (
      invites.map((invite) => (
        <article key={invite.id} className="invite-row">
          <div>
            <strong>{invite.email}</strong>
            <p>{invite.role} · pending</p>
          </div>
          <button
            type="button"
            className="chip-action danger invite-delete-btn"
            data-testid={`invite-delete-${invite.id}`}
            onClick={() => deleteInvite(invite)}
          >
            Cancel
          </button>
        </article>
      ))
    ) : (
      <div className="invite-empty">No pending invites yet.</div>
    )}
  </div>
</section>
          </section>
        ) : null}
      </main>
    </div>

    <TaskModal
      editingTask={editingTask}
      setEditingTask={setEditingTask}
      handleEditSave={handleEditSave}
      teamMembers={teamMembers}
      columns={sections}
      disciplines={disciplines}
      priorities={priorities}
      labelPool={labelPool}
      deleteTask={deleteTask}
      addSubtaskToEditing={addSubtaskToEditing}
    />
  </>
)
}

export default App