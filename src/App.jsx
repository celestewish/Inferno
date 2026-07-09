import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { supabase, formatSupabaseError, isMissingColumnError, isMissingTableError, isAccessError } from './lib/supabase'
import ProjectSidebar from './components/ProjectSidebar'
import ProjectHeader from './components/ProjectHeader'
import TaskBoard from './components/TaskBoard'
import DetailsPanel from './components/DetailsPanel'
import TaskModal from './components/TaskModal'
import TasksView from './components/TasksView'
import CalendarView from './components/CalendarView'
import ReportsView from './components/ReportsView'
import DocsView from './components/DocsView'
import CodeForgeView from './components/CodeForgeView'
import WarRoomView from './components/WarRoomView'
import StudioHomeView from './components/StudioHomeView'
import NotificationsView from './components/NotificationsView'
import CommandPalette from './components/CommandPalette'
import TemplatesView from './components/TemplatesView'
import { getTemplate, buildTemplateTasks, templateTaskCount } from './lib/templates'
import RecapView from './components/RecapView'
import PortfolioView from './components/PortfolioView'
import DatePicker from './components/DatePicker.jsx'
import MarketingHome from './components/MarketingHome'
import { FlameIcon, PlusIcon, CloseIcon, MenuIcon } from './components/Icons'
import InfernoLogo from './components/InfernoLogo'
import {
  createActivity,
  defaultProjects,
  defaultRoles,
  defaultTasks,
  defaultTeamMembers,
  defaultTheme,
  disciplines,
  FALLBACK_STATUS,
  gameCategories,
  labelPool,
  mergeWithDefaults,
  methodologies,
  priorities,
  resolveSections,
  sanitizeBoardSettings,
  sanitizeTheme,
  slugifySection,
} from './data/defaultData'
import { buildInviteUrl, siteUrl } from './lib/site'
import {
  XP_REWARDS,
  BADGES,
  levelForXp,
  levelProgress,
  normalizeBadges,
  hasBadge,
  newlyEarnedBadges,
  DAILY_FOCUS_COMPLETE_XP,
  MAX_DAILY_FOCUS,
  getTodayKey,
  getDailyFocus,
  isDailyFocusExpired,
  setDailyFocus,
  clearDailyFocus,
  getDailyFocusProgress,
  shouldAwardDailyFocus,
  awardDailyFocusCompletion,
  updateMomentumStreak,
  createBossFight,
  getBossProgress,
  shouldAwardBossReward,
  markBossClaimed,
  getBossRewardXp,
  pickBossTasks,
  computeBossRewardXp,
} from './lib/gamification'
import {
  BOARD_CHANNEL_KEY,
  CAMPFIRE_REACTIONS,
  DEFAULT_CHANNEL_SUGGESTIONS,
  buildChannelGroups,
  flattenChannels,
  channelProjectId,
  customChannelKey,
  messageChannelKey,
  filterMessagesByChannel,
  normalizeReactions,
  reactionCount,
  hasReacted,
  toggleReaction,
  firstLine,
  renderMessageSegments,
} from './lib/campfire'
import { validateDocInput } from './lib/docs'
import { validateRepoInput } from './lib/codeforge'
import { validateMeetingNote } from './lib/warroom'
import { buildNotifications, applyReadState, unreadCount as countUnread, allKeys } from './lib/notifications'

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
  const [campfireChannel, setCampfireChannel] = useState(BOARD_CHANNEL_KEY)
  const [campfireContextOpen, setCampfireContextOpen] = useState(false)
  const [customChannels, setCustomChannels] = useState([])
  const [addingChannelProjectId, setAddingChannelProjectId] = useState(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [savingChannel, setSavingChannel] = useState(false)
  const [docs, setDocs] = useState([])
  const [docsMigrationMissing, setDocsMigrationMissing] = useState(false)
  const [docsAccessError, setDocsAccessError] = useState(false)
  const [repos, setRepos] = useState([])
  const [reposMigrationMissing, setReposMigrationMissing] = useState(false)
  const [meetingNotes, setMeetingNotes] = useState([])
  const [meetingNotesMigrationMissing, setMeetingNotesMigrationMissing] = useState(false)
  const [notificationReads, setNotificationReads] = useState(() => new Set())
  const [notificationsMigrationMissing, setNotificationsMigrationMissing] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
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
  // Gamification: XP / level / earned badges for the signed-in user, loaded
  // separately from the core profile so a missing migration degrades to a
  // zeroed-out (but non-crashing) progress state. `celebrations` drives the
  // transient "Quest Complete" / level-up / badge-unlock toasts.
  const [gamification, setGamification] = useState(null)
  const [celebrations, setCelebrations] = useState([])
  const celebrationSeq = useRef(0)
  // Daily Focus Quests: the picker modal + its in-flight selection draft.
  const [focusPickerOpen, setFocusPickerOpen] = useState(false)
  const [focusDraft, setFocusDraft] = useState([])
  // Milestone Boss Fights: the create/edit modal + its in-flight draft. Weak
  // points (taskIds) and rewardXp are rolled by Inferno, not chosen by the user.
  const [bossModalOpen, setBossModalOpen] = useState(false)
  const [bossDraft, setBossDraft] = useState({ id: null, name: '', phase: '', taskIds: [], rewardXp: 0, defeated: false })
  // Mirror the latest gamification snapshot in a ref so the awarding engine can
  // read current XP/badges without stale closures and without re-creating its
  // callbacks on every progress change.
  const gamificationRef = useRef(null)
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    gamer_tag: '',
    pronouns: '',
    avatar_url: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  // Defaults to true (hidden) so the hint never flashes before the profile
  // loads and never nags when the backing column is missing.
  const [mobileBoardHintSeen, setMobileBoardHintSeen] = useState(true)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [savingTheme, setSavingTheme] = useState(false)
  const [themeSaved, setThemeSaved] = useState(false)
  const [themeError, setThemeError] = useState('')
  const [passwordResetStatus, setPasswordResetStatus] = useState('idle')
  const [passwordResetMessage, setPasswordResetMessage] = useState('')
  const [memberRoles, setMemberRoles] = useState({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [newBoardSetting, setNewBoardSetting] = useState({ tags: '', categories: '', roles: '' })
  const [boardInfoForm, setBoardInfoForm] = useState({ name: '', description: '' })
  const [savingBoardInfo, setSavingBoardInfo] = useState(false)
  const [boardInfoSaved, setBoardInfoSaved] = useState(false)
  const [boardInfoError, setBoardInfoError] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [deletingBoard, setDeletingBoard] = useState(false)
  // Password recovery (from the emailed reset link) shows a dedicated
  // update-password panel instead of dropping the user onto the board.
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoveryForm, setRecoveryForm] = useState({ password: '', confirmPassword: '' })
  const [recoveryStatus, setRecoveryStatus] = useState('idle')
  const [recoveryMessage, setRecoveryMessage] = useState('')

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
    if (event === 'PASSWORD_RECOVERY') {
      // The user followed the emailed reset link. Show the update-password
      // panel and load their board in the background so it's ready afterward.
      setRecoveryMode(true)
      setRecoveryStatus('idle')
      setRecoveryMessage('')
      setLoading(false)
      if (session) loadAllData(session.user.id)
    } else if (event === 'SIGNED_IN' && session) {
      loadAllData(session.user.id)
    } else if (event === 'SIGNED_OUT') {
      setProjects([])
      setTasks([])
      setTeamMembers(defaultTeamMembers)
      setMemberRoles({})
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
      setCustomChannels([])
      setCampfireChannel(BOARD_CHANNEL_KEY)
      setDocs([])
      setDocsMigrationMissing(false)
      setRepos([])
      setReposMigrationMissing(false)
      setMeetingNotes([])
      setMeetingNotesMigrationMissing(false)
      setNotificationReads(new Set())
      setNotificationsMigrationMissing(false)
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

  // Keep the awarding engine's ref in sync with loaded/updated progress.
  useEffect(() => {
    gamificationRef.current = gamification
  }, [gamification])

  // Global command palette shortcut (Ctrl/Cmd+K), available whenever signed in.
  useEffect(() => {
    if (!session?.user) return undefined
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault()
        setCommandPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [session?.user])

  // Escape closes the mobile navigation drawer, and body scroll is locked while
  // it is open so the page underneath does not scroll behind the overlay.
  useEffect(() => {
    if (!mobileNavOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileNavOpen])

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

      // A single user can have several presence metas at once (multiple tabs
      // or rapid re-tracks), which previously rendered the same person more
      // than once. Collapse to one entry per user, keeping the most recent
      // presence so their active project stays accurate.
      const byUser = new Map()
      Object.entries(state).forEach(([key, presences]) => {
        ;(presences || []).forEach((presence) => {
          const userId = presence.userId ?? key
          const entry = {
            key,
            userId,
            email: presence.email ?? 'Unknown user',
            projectId: presence.projectId ?? null,
            onlineAt: presence.onlineAt ?? null,
          }
          const existing = byUser.get(userId)
          if (!existing || (entry.onlineAt ?? '') >= (existing.onlineAt ?? '')) {
            byUser.set(userId, entry)
          }
        })
      })

      setOnlineUsers([...byUser.values()])
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
        setCustomChannels([])
        setDocs([])
        setDocsMigrationMissing(false)
        setRepos([])
        setReposMigrationMissing(false)
        setMeetingNotes([])
        setMeetingNotesMigrationMissing(false)
        setNotificationReads(new Set())
        setNotificationsMigrationMissing(false)
  return
}

  const [
  { data: projectData },
  { data: taskData },
  { data: memberData },
  { data: boardMemberRows },
  { data: messageData },
  { data: inviteData },
  { data: channelData },
  { data: docData, error: docError },
  { data: repoData, error: repoError },
  { data: meetingData, error: meetingError },
  { data: notifReadData, error: notifReadError },
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
  // Campfire channels; resolves with null data if the migration is not yet
  // pushed, in which case the UI falls back to board + default project rooms.
  supabase
    .from('campfire_channels')
    .select('*')
    .eq('board_id', activeBoardId)
    .order('created_at', { ascending: true }),
  // Docs Hub links; resolves with an error if the migration is not yet pushed,
  // in which case the Docs Hub shows a non-blocking "apply migration" note and
  // the rest of the app keeps working.
  supabase
    .from('board_docs')
    .select('*')
    .eq('board_id', activeBoardId)
    .order('created_at', { ascending: false }),
  // Code Forge repositories; resolves with an error if the migration is not yet
  // pushed, in which case Code Forge shows a non-blocking note and the rest of
  // the app keeps working.
  supabase
    .from('board_repositories')
    .select('*')
    .eq('board_id', activeBoardId)
    .order('created_at', { ascending: false }),
  // War Room meeting notes; resolves with an error if the migration is not yet
  // pushed, in which case War Room shows a non-blocking note and voice still
  // works (voice needs no table).
  supabase
    .from('meeting_notes')
    .select('*')
    .eq('board_id', activeBoardId)
    .is('archived_at', null)
    .order('created_at', { ascending: false }),
  // Notifications center read state; resolves with an error if the migration is
  // not yet pushed, in which case the feed still renders but "read" does not
  // persist across reloads (a non-blocking note is shown).
  supabase
    .from('notification_reads')
    .select('notification_key')
    .eq('board_id', activeBoardId)
    .eq('user_id', userId),
])


  const loadedProjects = projectData?.length ? projectData.map(dbToProject) : []
  const loadedTasks = taskData?.length ? taskData.map(dbToTask) : []
  const loadedMembers = memberData?.length ? memberData.map((m) => m.name) : defaultTeamMembers
  const loadedRoles = Object.fromEntries(
    (memberData ?? []).filter((m) => m.role).map((m) => [m.name, m.role])
  )
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
  setMemberRoles(loadedRoles)
  setBoardMembers(boardMemberRows ?? [])
  setLoading(false)
  setMessages(loadedMessages)
  setCustomChannels(channelData?.length ? channelData.map(dbToChannel) : [])
  setDocsMigrationMissing(isMissingTableError(docError) || isMissingColumnError(docError))
  setDocsAccessError(isAccessError(docError))
  setDocs(docData?.length ? docData.map(dbToDoc) : [])
  setReposMigrationMissing(Boolean(repoError))
  setRepos(repoData?.length ? repoData.map(dbToRepo) : [])
  setMeetingNotesMigrationMissing(Boolean(meetingError))
  setMeetingNotes(meetingData?.length ? meetingData.map(dbToMeetingNote) : [])
  setNotificationsMigrationMissing(Boolean(notifReadError))
  setNotificationReads(new Set((notifReadData ?? []).map((row) => row.notification_key)))

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

  // Load and apply the signed-in user's saved appearance. Queried separately
  // from the profile columns above so that a missing theme_settings column
  // (migration not yet applied) degrades gracefully to the default theme
  // instead of breaking core profile loading. Skipped on background refreshes
  // so an in-progress, unsaved swatch edit is not reverted underfoot.
  if (!background) {
    const { data: themeRow, error: themeLoadError } = await supabase
      .from('profiles')
      .select('theme_settings')
      .eq('id', userId)
      .maybeSingle()

    if (themeLoadError) {
      console.error('Theme settings load error:', formatSupabaseError(themeLoadError), themeLoadError)
      setTheme(defaultTheme)
    } else {
      setTheme(themeRow?.theme_settings ? sanitizeTheme(themeRow.theme_settings) : defaultTheme)
    }

    // Load the one-time mobile board swipe hint flag separately for the same
    // graceful-degradation reason as theme_settings: a missing column (migration
    // not yet applied) must not break profile loading. When it errors we treat
    // the hint as already seen so users are never nagged with something we
    // cannot persist a dismissal for.
    const { data: hintRow, error: hintLoadError } = await supabase
      .from('profiles')
      .select('mobile_board_hint_seen_at')
      .eq('id', userId)
      .maybeSingle()

    if (hintLoadError) {
      console.error('Mobile board hint load error:', formatSupabaseError(hintLoadError), hintLoadError)
      setMobileBoardHintSeen(true)
    } else {
      setMobileBoardHintSeen(Boolean(hintRow?.mobile_board_hint_seen_at))
    }

    // Load gamification progress separately for the same graceful-degradation
    // reason as theme_settings: a missing migration must not break the app. A
    // load error leaves progress at the safe zero default.
    const { data: gameRow, error: gameLoadError } = await supabase
      .from('profiles')
      .select('xp, level, badges, selected_title, gamification_settings')
      .eq('id', userId)
      .maybeSingle()

    if (gameLoadError) {
      console.error('Gamification load error:', formatSupabaseError(gameLoadError), gameLoadError)
      setGamification({ xp: 0, level: 1, badges: [], selected_title: null, settings: {} })
    } else {
      const xp = Number.isFinite(gameRow?.xp) ? gameRow.xp : 0
      setGamification({
        xp,
        level: gameRow?.level ?? levelForXp(xp),
        badges: normalizeBadges(gameRow?.badges),
        selected_title: gameRow?.selected_title ?? null,
        settings:
          gameRow?.gamification_settings && typeof gameRow.gamification_settings === 'object'
            ? gameRow.gamification_settings
            : {},
      })
    }
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

  const campfireChannelsChannel = supabase
    .channel(`campfire-channels-${currentBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'campfire_channels',
        filter: `board_id=eq.${currentBoardId}`,
      },
      refresh
    )
    .subscribe()

  return () => {
    supabase.removeChannel(projectsChannel)
    supabase.removeChannel(teamMembersChannel)
    supabase.removeChannel(boardMembersChannel)
    supabase.removeChannel(tasksChannel)
    supabase.removeChannel(campfireChannelsChannel)
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
}, [messages.length, campfireChannel])

useEffect(() => {
  const acceptInviteFromUrl = async () => {
    if (!session?.user) return

    const url = new URL(window.location.href)
    const token = url.searchParams.get('invite')
    if (!token) return

    // Accept through the SECURITY DEFINER RPC, which validates the token,
    // email match and expiry server-side and joins only the invited board.
    const { data: joinedBoardId, error } = await supabase.rpc('accept_board_invite', {
      p_token: token,
    })

    if (error) {
      console.error('Accept invite error:', formatSupabaseError(error), error)
      window.alert(error.message || 'This invite could not be accepted.')
      return
    }

    url.searchParams.delete('invite')
    window.history.replaceState({}, '', url.toString())

    loadAllData(session.user.id, joinedBoardId)
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

  // Acceptance is done through a SECURITY DEFINER RPC so membership is created
  // for exactly the invited board (and no other), even under strict RLS that
  // forbids arbitrary self-insertion into board_members.
  const { data: joinedBoardId, error: acceptError } = await supabase.rpc('accept_board_invite', {
    p_token: invite.token,
  })

  if (acceptError) {
    console.error('Accept invite error:', formatSupabaseError(acceptError), acceptError)
    window.alert(acceptError.message || 'We could not accept this invite. Please try again.')
    setAcceptingInviteId(null)
    return
  }

  setMyInvites((current) => current.filter((item) => item.id !== invite.id))
  await loadAllData(session.user.id, joinedBoardId ?? invite.boardId)
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
    bossFights: Array.isArray(row.boss_fights) ? row.boss_fights : [],
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
    codeRefs: Array.isArray(row.code_refs) ? row.code_refs : [],
    docRefs: Array.isArray(row.doc_refs) ? row.doc_refs : [],
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
  boss_fights: Array.isArray(p.bossFights) ? p.bossFights : [],
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
    projectId: row.project_id ?? null,
    channelKey: messageChannelKey({ channelKey: row.channel_key }),
    userId: row.user_id,
    text: row.message,
    pinned: Boolean(row.pinned),
    reactions: normalizeReactions(row.reactions),
    createdAt: row.created_at,
    editedAt: row.updated_at ?? null,
  }
}

function dbToChannel(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    projectId: row.project_id ?? null,
    name: row.name,
    channelKey: row.channel_key,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  }
}

function dbToDoc(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    projectId: row.project_id ?? null,
    taskId: row.task_id ?? null,
    userId: row.user_id,
    title: row.title,
    url: row.url,
    docType: row.doc_type,
    description: row.description ?? '',
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  }
}

function dbToRepo(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    projectId: row.project_id ?? null,
    userId: row.user_id,
    provider: row.provider ?? 'github',
    displayName: row.display_name,
    repoUrl: row.repo_url,
    owner: row.owner ?? null,
    repo: row.repo ?? null,
    description: row.description ?? '',
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  }
}

function dbToMeetingNote(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    projectId: row.project_id ?? null,
    roomKey: row.room_key ?? 'board',
    title: row.title,
    agenda: Array.isArray(row.agenda) ? row.agenda : [],
    notes: row.notes ?? '',
    actionItems: Array.isArray(row.action_items) ? row.action_items : [],
    createdBy: row.created_by,
    updatedBy: row.updated_by ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
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

  // ── Board permissions (real accounts, not the team_members name roster) ──
  // Ownership is authoritative from boards.owner_id; board_members.role gives
  // the collaboration role. These gate the owner-only management controls.
  const isBoardOwner = Boolean(currentBoard && userId && currentBoard.owner_id === userId)
  const myBoardRole =
    boardMembers.find((row) => row.user_id === userId)?.role ??
    (isBoardOwner ? 'owner' : null)

  // Heuristic: the seeded starter board still contains its original sample
  // projects. Used to clearly label seeded data as an example board.
  const isExampleBoard = useMemo(() => {
    if (!projects.length) return false
    const seededNames = new Set(defaultProjects.map((p) => p.name.toLowerCase()))
    return projects.some((p) => p.name && seededNames.has(p.name.toLowerCase()))
  }, [projects])

  // ── Board-level customization (tags, categories, roles) ──
  const boardSettings = useMemo(
    () => sanitizeBoardSettings(currentBoard?.settings),
    [currentBoard]
  )
  const availableTags = useMemo(
    () => mergeWithDefaults(labelPool, boardSettings.tags),
    [boardSettings]
  )
  const availableCategories = useMemo(
    () => mergeWithDefaults(gameCategories, boardSettings.categories),
    [boardSettings]
  )
  const availableRoles = useMemo(
    () => mergeWithDefaults(defaultRoles, boardSettings.roles),
    [boardSettings]
  )

  // Built-in defaults per setting key — used to reject duplicates and to mark
  // which entries are removable (only user-added ones can be removed).
  const settingDefaults = { tags: labelPool, categories: gameCategories, roles: defaultRoles }

  // Keep the editable board name/description form in sync with the active board
  // so switching boards loads that board's details rather than stale values.
  useEffect(() => {
    setBoardInfoForm({
      name: currentBoard?.name ?? '',
      description: currentBoard?.description ?? '',
    })
    setBoardInfoError('')
    setBoardInfoSaved(false)
  }, [currentBoardId, currentBoard?.name, currentBoard?.description])

  const persistBoardSettings = async (nextSettings) => {
    if (!currentBoardId) return
    setBoards((current) =>
      current.map((board) =>
        board.id === currentBoardId ? { ...board, settings: nextSettings } : board
      )
    )
    const { error } = await supabase
      .from('boards')
      .update({ settings: nextSettings })
      .eq('id', currentBoardId)
    if (error) console.error('Persist board settings error:', formatSupabaseError(error), error)
  }

  const addBoardSettingValue = (key, rawValue) => {
    const value = (rawValue ?? '').trim()
    if (!value || value.length > 40) return
    const merged = mergeWithDefaults(settingDefaults[key] ?? [], boardSettings[key])
    if (merged.some((item) => item.toLowerCase() === value.toLowerCase())) return
    persistBoardSettings({ ...boardSettings, [key]: [...boardSettings[key], value] })
    setNewBoardSetting((current) => ({ ...current, [key]: '' }))
  }

  const removeBoardSettingValue = (key, value) => {
    persistBoardSettings({
      ...boardSettings,
      [key]: boardSettings[key].filter((item) => item !== value),
    })
  }

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

  // Daily Focus Quests view model, derived from live tasks + stored settings.
  const todayKey = getTodayKey()
  const storedDailyFocus = getDailyFocus(gamification?.settings)
  const dailyFocusActive =
    storedDailyFocus && !isDailyFocusExpired(storedDailyFocus, todayKey) ? storedDailyFocus : null
  const focusCompletedById = useMemo(() => {
    const map = {}
    for (const task of tasks) map[task.id] = task.completed
    return map
  }, [tasks])
  const focusProgress = dailyFocusActive
    ? getDailyFocusProgress(dailyFocusActive, focusCompletedById)
    : { total: 0, completed: 0, allComplete: false }
  const focusTasks = dailyFocusActive
    ? dailyFocusActive.task_ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean)
    : []
  const focusCandidates = currentProject
    ? tasks.filter((task) => task.projectId === currentProject.id && !task.completed)
    : []

  // Notifications center feed: derived deterministically from board data, then
  // annotated with per-user read state loaded from notification_reads.
  const notifications = useMemo(() => {
    const feed = buildNotifications({
      projects,
      meetingNotes,
      messages,
      boardMembers,
      profiles,
      invites,
      dailyFocusClaimed: Boolean(dailyFocusActive?.claimed),
      dailyFocusDate: dailyFocusActive ? todayKey : '',
    })
    return applyReadState(feed, notificationReads)
  }, [projects, meetingNotes, messages, boardMembers, profiles, invites, dailyFocusActive, todayKey, notificationReads])
  const unreadNotifications = countUnread(notifications)
  const momentumStreak = gamification?.settings?.momentum_streak ?? null
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  // Milestone Boss Fights view model, derived from the active project + tasks.
  const projectBosses = currentProject && Array.isArray(currentProject.bossFights)
    ? currentProject.bossFights
    : []
  const bossTaskCandidates = currentProject
    ? tasks.filter((task) => task.projectId === currentProject.id)
    : []

  // ── Campfire (chat) view model ──
  const campfireGroups = useMemo(
    () => buildChannelGroups(projects, customChannels),
    [projects, customChannels],
  )
  const campfireChannels = useMemo(() => flattenChannels(campfireGroups), [campfireGroups])
  // Guard against a stale selection (e.g. a project room whose project was
  // deleted, or a channel that was just archived) by falling back to the board room.
  const activeCampfireKey = campfireChannels.some((channel) => channel.key === campfireChannel)
    ? campfireChannel
    : BOARD_CHANNEL_KEY
  const activeCampfireChannel =
    campfireChannels.find((channel) => channel.key === activeCampfireKey) || campfireChannels[0]
  const campfireMessages = useMemo(
    () => filterMessagesByChannel(messages, activeCampfireKey),
    [messages, activeCampfireKey],
  )
  const pinnedCampfireMessages = useMemo(
    () => campfireMessages.filter((message) => message.pinned),
    [campfireMessages],
  )

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
    const { subtasks, labels, activity, projectId, codeRefs, docRefs, ...rest } = updates
    const patch = {
      ...rest,
      ...(subtasks !== undefined && { subtasks }),
      ...(labels !== undefined && { labels }),
      ...(activity !== undefined && { activity }),
      ...(projectId !== undefined && { project_id: projectId }),
      ...(codeRefs !== undefined && { code_refs: codeRefs }),
      ...(docRefs !== undefined && { doc_refs: docRefs }),
    }
    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId)
    // If the task-links migration has not been applied yet, the code_refs/doc_refs
    // columns are missing. Retry without them so the rest of the edit still saves.
    if (error && isMissingColumnError(error) && (codeRefs !== undefined || docRefs !== undefined)) {
      const { code_refs, doc_refs, ...fallback } = patch
      await supabase.from('tasks').update(fallback).eq('id', taskId)
    } else if (error) {
      console.error('Update task error:', formatSupabaseError(error), error)
    }
  }

  const deleteTask = async (taskId) => {
    const removed = tasks.find((t) => t.id === taskId)
    setTasks((current) => current.filter((t) => t.id !== taskId))
    if (removed) logProjectActivity(removed.projectId, 'delete', `Deleted task ${removed.title}.`)
    setEditingTask((current) => (current?.id === taskId ? null : current))
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  // ── Gamification awarding engine ──
  // Side effects (persistence + toasts) live here, deliberately OUT of any
  // setState reducer, so React StrictMode's double-invoke never double-awards.

  const pushCelebration = (celebration) => {
    celebrationSeq.current += 1
    const id = celebrationSeq.current
    setCelebrations((current) => [...current, { id, ...celebration }])
    // Auto-dismiss after a beat; the toast also has a manual close button.
    window.setTimeout(() => {
      setCelebrations((current) => current.filter((item) => item.id !== id))
    }, 4200)
  }

  const dismissCelebration = (id) => {
    setCelebrations((current) => current.filter((item) => item.id !== id))
  }

  // Persist the progress snapshot. Wrapped so a failure (e.g. missing migration)
  // is logged and swallowed rather than blocking task completion.
  const persistGamification = async (snapshot) => {
    if (!userId) return
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            xp: snapshot.xp,
            level: snapshot.level,
            badges: snapshot.badges,
            selected_title: snapshot.selected_title ?? null,
            gamification_settings: snapshot.settings ?? {},
          },
          { onConflict: 'id' },
        )
      if (error) console.error('Gamification persist error:', formatSupabaseError(error), error)
    } catch (persistError) {
      console.error('Gamification persist threw:', persistError)
    }
  }

  // Build the stats snapshot the badge evaluator needs from live app state,
  // allowing callers to override/augment values that are known at award time
  // (e.g. the task just completed, or boardCount:1 right after creating one).
  const buildBadgeStats = (overrides = {}) => {
    const completedTasks =
      overrides.completedTasks ??
      tasks.filter((task) => task.completed).map((task) => ({ ...task, projectId: task.projectId }))
    const projectTaskTotals = {}
    for (const task of tasks) {
      const key = task.projectId ?? 'unknown'
      projectTaskTotals[key] = (projectTaskTotals[key] ?? 0) + 1
    }
    return {
      completedTasks,
      boardCount: overrides.boardCount ?? (currentBoardId ? 1 : 0),
      inviteCount: overrides.inviteCount ?? invites.length,
      level: overrides.level ?? gamificationRef.current?.level ?? 1,
      projectTaskTotals: overrides.projectTaskTotals ?? projectTaskTotals,
      tutorialDone: overrides.tutorialDone ?? false,
    }
  }

  // Core award routine: apply an XP delta, mark a task rewarded (for idempotent
  // per-task awarding), re-evaluate badges, update state + ref, fire toasts, and
  // persist. Reads the latest snapshot from the ref to avoid stale closures.
  const awardGamification = ({ xpDelta = 0, reason, rewardTaskId, extraStats = {}, mutateSettings } = {}) => {
    if (!userId) return
    const base = gamificationRef.current ?? {
      xp: 0,
      level: 1,
      badges: [],
      selected_title: null,
      settings: {},
    }

    const nextXp = Math.max(0, (base.xp ?? 0) + xpDelta)
    const prevLevel = base.level ?? 1
    const nextLevel = levelForXp(nextXp)

    // Track rewarded tasks so completing the same task twice never farms XP.
    let settings = { ...(base.settings ?? {}) }
    if (rewardTaskId) {
      const rewarded = Array.isArray(settings.rewarded_tasks) ? settings.rewarded_tasks : []
      if (!rewarded.includes(rewardTaskId)) {
        settings.rewarded_tasks = [...rewarded, rewardTaskId]
      }
    }
    // Let callers fold additional settings changes (e.g. daily-focus claim +
    // streak) into the same atomic snapshot/persist.
    if (typeof mutateSettings === 'function') {
      settings = mutateSettings(settings) ?? settings
    }

    const fresh = newlyEarnedBadges(
      buildBadgeStats({ ...extraStats, level: nextLevel }),
      base.badges,
    )
    const nextBadges = fresh.length ? [...normalizeBadges(base.badges), ...fresh] : base.badges

    const snapshot = {
      xp: nextXp,
      level: nextLevel,
      badges: nextBadges,
      selected_title: base.selected_title ?? null,
      settings,
    }

    gamificationRef.current = snapshot
    setGamification(snapshot)

    if (xpDelta > 0 && reason) {
      pushCelebration({ kind: 'xp', title: reason, detail: `+${xpDelta} XP` })
    }
    if (nextLevel > prevLevel) {
      pushCelebration({ kind: 'level', title: `Level ${nextLevel}`, detail: 'Level up!' })
    }
    for (const badge of fresh) {
      pushCelebration({
        kind: 'badge',
        title: badge.name,
        detail: 'Badge unlocked',
        icon: badge.icon,
      })
    }

    persistGamification(snapshot)
  }

  // Award XP + badges for a task reaching Done for the first time.
  const rewardTaskCompletion = (task) => {
    if (!userId || !task) return
    const settings = gamificationRef.current?.settings ?? {}
    const rewarded = Array.isArray(settings.rewarded_tasks) ? settings.rewarded_tasks : []
    if (rewarded.includes(task.id)) return // already rewarded — no farming

    const isHigh = String(task.priority ?? '').toLowerCase() === 'high'
    const xpDelta = isHigh ? XP_REWARDS.TASK_COMPLETE_HIGH : XP_REWARDS.TASK_COMPLETE

    // Include the just-completed task so badge evaluation sees it even before
    // the optimistic setTasks has flushed.
    const completedNow = [
      ...tasks.filter((t) => t.completed && t.id !== task.id).map((t) => ({ ...t })),
      { ...task, completed: true },
    ]
    awardGamification({
      xpDelta,
      reason: 'Quest Complete',
      rewardTaskId: task.id,
      extraStats: { completedTasks: completedNow },
    })
  }

  // Persist a settings-only change (daily focus selection / clear) without
  // touching XP, level, or badges. Same non-blocking persistence as awards.
  const applyGamificationSettings = (nextSettings) => {
    if (!userId) return
    const base = gamificationRef.current ?? {
      xp: 0,
      level: 1,
      badges: [],
      selected_title: null,
      settings: {},
    }
    const snapshot = { ...base, settings: nextSettings }
    gamificationRef.current = snapshot
    setGamification(snapshot)
    persistGamification(snapshot)
  }

  const saveDailyFocus = (taskIds) => {
    const base = gamificationRef.current?.settings ?? {}
    applyGamificationSettings(setDailyFocus(base, taskIds, getTodayKey()))
  }

  const clearDailyFocusSelection = () => {
    const base = gamificationRef.current?.settings ?? {}
    applyGamificationSettings(clearDailyFocus(base))
  }

  const openFocusPicker = () => {
    const df = getDailyFocus(gamificationRef.current?.settings)
    const active = df && !isDailyFocusExpired(df, getTodayKey()) ? df.task_ids : []
    setFocusDraft(active)
    setFocusPickerOpen(true)
  }

  const toggleFocusDraft = (id) => {
    setFocusDraft((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id)
      if (current.length >= MAX_DAILY_FOCUS) return current
      return [...current, id]
    })
  }

  const confirmFocusPicker = () => {
    saveDailyFocus(focusDraft)
    setFocusPickerOpen(false)
  }

  // After a task completes, award the one-time daily-focus bonus if today's
  // selected tasks are now all done. `justCompletedId` compensates for the
  // not-yet-flushed optimistic setTasks, mirroring rewardTaskCompletion.
  const checkDailyFocusCompletion = (justCompletedId) => {
    if (!userId) return
    const base = gamificationRef.current
    const todayKey = getTodayKey()
    const dailyFocus = getDailyFocus(base?.settings)
    if (isDailyFocusExpired(dailyFocus, todayKey) || dailyFocus.claimed) return

    const completedById = {}
    for (const t of tasks) completedById[t.id] = t.completed
    if (justCompletedId) completedById[justCompletedId] = true

    if (!shouldAwardDailyFocus(dailyFocus, completedById, todayKey)) return
    awardGamification({
      xpDelta: DAILY_FOCUS_COMPLETE_XP,
      reason: 'Daily Quests Complete',
      mutateSettings: (settings) =>
        updateMomentumStreak(awardDailyFocusCompletion(settings, todayKey), todayKey),
    })
  }

  // ── Milestone Boss Fights ──
  // Bosses live on the project record. Update optimistically, then persist to
  // the projects table; a failed write surfaces a non-blocking toast and leaves
  // the local change in place so the board is never blocked.
  const updateProjectBossFights = (projectId, nextBossFights) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, bossFights: nextBossFights } : project,
      ),
    )
    supabase
      .from('projects')
      .update({ boss_fights: nextBossFights })
      .eq('id', projectId)
      .then(({ error }) => {
        if (error) {
          console.error('Boss fight persist error:', formatSupabaseError(error), error)
          pushCelebration({
            kind: 'error',
            title: 'Boss not saved',
            detail: 'Change kept locally only.',
          })
        }
      })
  }

  // Inferno rolls the weak points and reward; the player never hand-picks them,
  // so a boss can't be stacked with easy tasks for a big payout.
  const rollBossDraft = () => {
    const chosen = pickBossTasks(bossTaskCandidates, Math.random)
    return {
      taskIds: chosen.map((task) => task.id),
      rewardXp: chosen.length ? computeBossRewardXp(chosen, Math.random) : 0,
    }
  }

  const openBossCreator = () => {
    const rolled = rollBossDraft()
    setBossDraft({ id: null, name: '', phase: '', ...rolled, defeated: false })
    setBossModalOpen(true)
  }

  const openBossEditor = (boss) => {
    const progress = getBossProgress(boss, focusCompletedById)
    setBossDraft({
      id: boss.id,
      name: boss.name ?? '',
      phase: boss.phase ?? '',
      taskIds: Array.isArray(boss.task_ids) ? [...boss.task_ids] : [],
      rewardXp: getBossRewardXp(boss),
      defeated: Boolean(boss.claimed) || progress.defeated,
    })
    setBossModalOpen(true)
  }

  // Regenerate weak points + reward for the current draft. Blocked once a boss is
  // defeated so a claimed reward can never be re-rolled into a fresh payout.
  const rerollBossDraft = () => {
    setBossDraft((current) => {
      if (current.defeated) return current
      return { ...current, ...rollBossDraft() }
    })
  }

  const saveBossFight = () => {
    if (!currentProject) return
    const name = bossDraft.name.trim()
    // A boss must have a name and at least one rolled weak point, or it can never
    // be fought or defeated.
    if (!name || bossDraft.taskIds.length === 0) return
    const existing = Array.isArray(currentProject.bossFights) ? currentProject.bossFights : []
    let nextBosses
    if (bossDraft.id) {
      // Editing preserves claimed/defeated_at/created_at. A defeated boss only
      // updates its label so a claimed reward can never be farmed by re-saving.
      nextBosses = existing.map((boss) =>
        boss.id === bossDraft.id
          ? {
              ...boss,
              name,
              phase: bossDraft.phase.trim(),
              ...(bossDraft.defeated
                ? {}
                : {
                    task_ids: [...new Set(bossDraft.taskIds)],
                    reward_xp: getBossRewardXp({ reward_xp: bossDraft.rewardXp }),
                  }),
            }
          : boss,
      )
    } else {
      nextBosses = [
        ...existing,
        createBossFight({
          name,
          phase: bossDraft.phase.trim(),
          projectId: currentProject.id,
          taskIds: bossDraft.taskIds,
          rewardXp: bossDraft.rewardXp,
        }),
      ]
    }
    updateProjectBossFights(currentProject.id, nextBosses)
    setBossModalOpen(false)
  }

  const retireBossFight = (bossId) => {
    if (!currentProject) return
    const existing = Array.isArray(currentProject.bossFights) ? currentProject.bossFights : []
    updateProjectBossFights(currentProject.id, existing.filter((boss) => boss.id !== bossId))
  }

  // After a linked task completes, award the one-time boss bonus for any boss in
  // the task's project that just hit 0 HP. `justCompletedTask` compensates for
  // the not-yet-flushed optimistic setTasks, mirroring rewardTaskCompletion.
  const checkBossFights = (justCompletedTask) => {
    if (!userId || !justCompletedTask) return
    const project = projects.find((p) => p.id === justCompletedTask.projectId)
    const bosses = project && Array.isArray(project.bossFights) ? project.bossFights : []
    if (bosses.length === 0) return

    const completedById = {}
    for (const t of tasks) completedById[t.id] = t.completed
    completedById[justCompletedTask.id] = true

    const defeated = bosses.filter((boss) => shouldAwardBossReward(boss, completedById))
    if (defeated.length === 0) return

    const nowIso = new Date().toISOString()
    const defeatedIds = new Set(defeated.map((boss) => boss.id))
    const nextBosses = bosses.map((boss) =>
      defeatedIds.has(boss.id) ? markBossClaimed(boss, nowIso) : boss,
    )
    updateProjectBossFights(project.id, nextBosses)

    const completedNow = [
      ...tasks.filter((t) => t.completed && t.id !== justCompletedTask.id).map((t) => ({ ...t })),
      { ...justCompletedTask, completed: true },
    ]
    for (const boss of defeated) {
      awardGamification({
        xpDelta: getBossRewardXp(boss),
        reason: 'Boss Defeated',
        extraStats: { completedTasks: completedNow },
      })
    }
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
    if (nextStatus === 'done') {
      const doneTask = tasks.find((t) => t.id === taskId)
      if (doneTask) rewardTaskCompletion(doneTask)
      checkDailyFocusCompletion(taskId)
      if (doneTask) checkBossFights(doneTask)
    }
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
    const willComplete = !task.completed
    updateTask(task.id, {
      completed: willComplete,
      status: task.completed ? 'todo' : 'done',
      activity: [createActivity('complete', task.completed ? 'Reopened task.' : 'Marked task complete.'), ...(task.activity || [])],
    })
    if (willComplete) {
      rewardTaskCompletion(task)
      checkDailyFocusCompletion(task.id)
      checkBossFights(task)
    }
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
    setMemberRoles((current) => {
      const next = { ...current }
      delete next[member]
      return next
    })
    setTasks((current) => current.map((t) => ({ ...t, assignee: t.assignee === member ? 'Unassigned' : t.assignee })))
    await supabase
    .from('team_members')
    .delete()
    .eq('board_id', currentBoardId)
    .eq('name', member)
  }

  const updateMemberRole = async (member, role) => {
    if (member === 'Unassigned') return
    const nextRole = (role ?? '').trim()
    setMemberRoles((current) => {
      const next = { ...current }
      if (nextRole) next[member] = nextRole
      else delete next[member]
      return next
    })
    const { error } = await supabase
      .from('team_members')
      .update({ role: nextRole || null })
      .eq('board_id', currentBoardId)
      .eq('name', member)
    if (error) console.error('Update member role error:', formatSupabaseError(error), error)
  }

  // ── Board access (real accounts / permissions) ──
  // Remove (kick) a collaborator from the active board. Owner-only and enforced
  // server-side by the remove_board_member RPC.
  const removeBoardMember = async (member) => {
    if (!currentBoardId || !member?.user_id) return
    if (member.user_id === userId) return
    const label = profiles[member.user_id] || `${member.user_id.slice(0, 8)}…`
    if (!window.confirm(`Remove ${label} from this board? They will lose access to its projects, tasks, and chat.`)) return

    const { error } = await supabase.rpc('remove_board_member', {
      p_board_id: currentBoardId,
      p_user_id: member.user_id,
    })
    if (error) {
      console.error('Remove board member error:', formatSupabaseError(error), error)
      window.alert(error.message || 'We could not remove that member. Please try again.')
      return
    }
    await loadAllData(userId, currentBoardId)
  }

  // Transfer ownership to another member. Owner-only; the RPC demotes the
  // previous owner to editor and promotes the target to owner atomically.
  const transferBoardOwnership = async (member) => {
    if (!currentBoardId || !member?.user_id || member.user_id === userId) return
    const label = profiles[member.user_id] || `${member.user_id.slice(0, 8)}…`
    if (!window.confirm(`Make ${label} the owner of this board? You will become an editor and lose owner controls.`)) return

    const { error } = await supabase.rpc('transfer_board_ownership', {
      p_board_id: currentBoardId,
      p_new_owner_id: member.user_id,
    })
    if (error) {
      console.error('Transfer ownership error:', formatSupabaseError(error), error)
      window.alert(error.message || 'We could not transfer ownership. Please try again.')
      return
    }
    await loadAllData(userId, currentBoardId)
  }

  // Change a member's collaboration role (editor/viewer). Owner-only.
  const changeBoardMemberRole = async (member, role) => {
    if (!currentBoardId || !member?.user_id || member.user_id === userId) return
    const { error } = await supabase.rpc('set_board_member_role', {
      p_board_id: currentBoardId,
      p_user_id: member.user_id,
      p_role: role,
    })
    if (error) {
      console.error('Set board member role error:', formatSupabaseError(error), error)
      window.alert(error.message || 'We could not update that role. Please try again.')
      return
    }
    await loadAllData(userId, currentBoardId)
  }

  // ── Board management (create / switch / rename / delete) ──
  const switchBoard = async (boardId) => {
    if (!boardId || boardId === currentBoardId) return
    await loadAllData(userId, boardId)
    setActiveSection('board')
  }

  const createBoard = async () => {
    if (creatingBoard) return
    const name = (window.prompt('Name your new board', 'New Board') || '').trim()
    if (!name) return
    if (name.length > 100) {
      window.alert('Board names must be 100 characters or fewer.')
      return
    }
    setCreatingBoard(true)
    const { data: created, error } = await supabase
      .from('boards')
      .insert({ owner_id: userId, name, description: '' })
      .select()
      .single()
    if (error || !created) {
      console.error('Create board error:', formatSupabaseError(error), error)
      window.alert('We could not create the board. Please try again.')
      setCreatingBoard(false)
      return
    }
    const { error: memberError } = await supabase
      .from('board_members')
      .insert([{ board_id: created.id, user_id: userId, role: 'owner' }])
    if (memberError) {
      console.error('Create board membership error:', formatSupabaseError(memberError), memberError)
      window.alert('The board was created but we could not add you as its owner. Please try again.')
      setCreatingBoard(false)
      return
    }
    // Award the First Spark badge + first-board XP once. Guarded on the badge so
    // additional boards never re-award. extraStats forces boardCount:1 because
    // loadAllData has not refreshed currentBoardId yet.
    if (!hasBadge(gamificationRef.current?.badges, 'first_spark')) {
      awardGamification({
        xpDelta: XP_REWARDS.FIRST_BOARD,
        reason: 'First Spark',
        extraStats: { boardCount: 1 },
      })
    }
    await loadAllData(userId, created.id)
    setActiveSection('board')
    setCreatingBoard(false)
  }

  const saveBoardInfo = async (event) => {
    event?.preventDefault?.()
    if (!currentBoardId || savingBoardInfo) return
    const name = boardInfoForm.name.trim()
    const description = boardInfoForm.description.trim()
    if (!name) {
      setBoardInfoError('Board name is required.')
      return
    }
    if (name.length > 100) {
      setBoardInfoError('Board name must be 100 characters or fewer.')
      return
    }
    setSavingBoardInfo(true)
    setBoardInfoError('')
    setBoardInfoSaved(false)
    const { error } = await supabase
      .from('boards')
      .update({ name, description })
      .eq('id', currentBoardId)
    if (error) {
      console.error('Save board info error:', formatSupabaseError(error), error)
      setBoardInfoError(error.message || 'We could not save the board details. Please try again.')
      setSavingBoardInfo(false)
      return
    }
    setBoards((current) =>
      current.map((board) =>
        board.id === currentBoardId ? { ...board, name, description } : board
      )
    )
    setSavingBoardInfo(false)
    setBoardInfoSaved(true)
    window.setTimeout(() => setBoardInfoSaved(false), 2500)
  }

  const deleteBoard = async () => {
    if (!currentBoardId || deletingBoard || !isBoardOwner) return
    const name = currentBoard?.name ?? ''
    const typed = window.prompt(
      `This permanently deletes "${name}" and all of its projects, tasks, messages, invites, and members. This cannot be undone.\n\nType the board name to confirm:`
    )
    if (typed === null) return
    if (typed.trim() !== name.trim()) {
      window.alert('That did not match the board name. Deletion cancelled.')
      return
    }
    setDeletingBoard(true)
    const { error } = await supabase.rpc('delete_board', { p_board_id: currentBoardId })
    if (error) {
      console.error('Delete board error:', formatSupabaseError(error), error)
      window.alert(error.message || 'We could not delete the board. Please try again.')
      setDeletingBoard(false)
      return
    }
    const remaining = boards.filter((board) => board.id !== currentBoardId)
    setBoards(remaining)
    if (remaining[0]) {
      await loadAllData(userId, remaining[0].id)
      setActiveSection('board')
    } else {
      // No boards left — loadAllData bootstraps a fresh starter board.
      setCurrentBoardId(null)
      await loadAllData(userId)
      setActiveSection('board')
    }
    setDeletingBoard(false)
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
const goToCampfire = () => setActiveSection('campfire')

// Open a task's detail modal by id from anywhere (Studio Home, search, etc.).
const openTaskById = (taskId) => {
  const task = tasks.find((t) => t.id === taskId)
  if (task) setEditingTask(task)
}

// Dispatch a command-palette quick action to the matching handler.
const runQuickAction = (id) => {
  switch (id) {
    case 'create-task':
      goToCreateTask()
      break
    case 'link-doc':
      handleSelectSection('docs')
      break
    case 'link-repo':
      handleSelectSection('codeforge')
      break
    case 'open-campfire':
      goToCampfire()
      break
    case 'open-warroom':
      handleSelectSection('warroom')
      break
    case 'create-boss':
      handleSelectSection('projects')
      openBossCreator()
      break
    default:
      break
  }
}

// Apply a Templates library starter pack to the current project. Creates many
// tasks at once, so it confirms first. Persists via the standard task path.
const applyTemplate = async (templateId) => {
  const template = getTemplate(templateId)
  if (!template) return
  if (!userId || !currentProject) {
    pushCelebration({ kind: 'error', title: 'No project selected', detail: 'Pick a project first, then apply a template.' })
    return
  }
  const count = templateTaskCount(template)
  const confirmed = window.confirm(
    `Apply "${template.name}" to ${currentProject.name}? This adds ${count} tasks to your backlog.`
  )
  if (!confirmed) return

  const newTasks = buildTemplateTasks(template, {
    projectId: currentProject.id,
    sprint: currentProject.phase || '',
    makeId: () => crypto.randomUUID(),
    makeActivity: (type, note) => createActivity(type, note),
  })
  if (!newTasks.length) return

  setTasks((current) => [...newTasks, ...current])
  logProjectActivity(currentProject.id, 'task', `Applied the ${template.name} template (${count} tasks).`)
  const { error } = await supabase.from('tasks').insert(newTasks.map((task) => taskToDb(task, userId)))
  if (error) {
    console.error('Apply template error:', formatSupabaseError(error), error)
    const ids = new Set(newTasks.map((task) => task.id))
    setTasks((current) => current.filter((task) => !ids.has(task.id)))
    pushCelebration({ kind: 'error', title: 'Template not applied', detail: 'Please try again.' })
    return
  }
  pushCelebration({ kind: 'xp', title: 'Template applied', detail: `${count} tasks added to ${currentProject.name}.`, icon: '✦' })
  handleSelectSection('board')
}

// Persist a single notification as read. Optimistically updates local state so
// the badge/list respond immediately; a missing migration is non-fatal (the
// note in NotificationsView explains read state will not survive a reload).
const markNotificationRead = async (key) => {
  if (!key) return
  const userId = session?.user?.id
  if (!userId || !currentBoardId) return
  setNotificationReads((prev) => new Set(prev).add(key))
  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      { board_id: currentBoardId, user_id: userId, notification_key: key },
      { onConflict: 'board_id,user_id,notification_key' }
    )
  if (error) {
    console.error('Mark notification read error:', formatSupabaseError(error), error)
    setNotificationsMigrationMissing(true)
  }
}

// Persist every notification currently in the feed as read.
const markAllNotificationsRead = async () => {
  const userId = session?.user?.id
  if (!userId || !currentBoardId) return
  const keys = allKeys(notifications)
  if (!keys.length) return
  setNotificationReads((prev) => {
    const next = new Set(prev)
    for (const key of keys) next.add(key)
    return next
  })
  const rows = keys.map((key) => ({
    board_id: currentBoardId,
    user_id: userId,
    notification_key: key,
  }))
  const { error } = await supabase
    .from('notification_reads')
    .upsert(rows, { onConflict: 'board_id,user_id,notification_key' })
  if (error) {
    console.error('Mark all notifications read error:', formatSupabaseError(error), error)
    setNotificationsMigrationMissing(true)
  }
}

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

  const channelKey = activeCampfireKey || BOARD_CHANNEL_KEY
  const projectId = channelProjectId(channelKey)

  const basePayload = { board_id: currentBoardId, user_id: userId, message: body }
  let { data, error } = await supabase
    .from('board_messages')
    .insert({ ...basePayload, channel_key: channelKey, project_id: projectId })
    .select()
    .single()

  // If the Campfire migration has not been pushed yet, fall back to a plain
  // board message so the chat is never blocked (it just lands in the board room).
  if (error && isMissingColumnError(error)) {
    ;({ data, error } = await supabase
      .from('board_messages')
      .insert(basePayload)
      .select()
      .single())
  }

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

// Pin/unpin via RPC so any board member (not just the author) can curate the
// pinned list. Optimistic, with a rollback if the RPC fails.
const toggleMessagePin = async (message) => {
  if (!userId) return
  const nextPinned = !message.pinned
  const previous = messages
  setMessages((current) =>
    current.map((item) => (item.id === message.id ? { ...item, pinned: nextPinned } : item)),
  )
  const { error } = await supabase.rpc('set_message_pinned', {
    p_message_id: message.id,
    p_pinned: nextPinned,
  })
  if (error) {
    console.error('Pin message error:', formatSupabaseError(error), error)
    setMessages(previous)
    pushCelebration({ kind: 'error', title: 'Pin not saved', detail: 'Change kept locally only.' })
  }
}

// React/unreact via RPC (board-member scoped, server-side toggle avoids races).
// Optimistic local toggle mirrors the server using the shared pure helper.
const toggleMessageReaction = async (message, reactionKey) => {
  if (!userId) return
  const previous = messages
  const optimistic = toggleReaction(message.reactions, reactionKey, userId)
  setMessages((current) =>
    current.map((item) => (item.id === message.id ? { ...item, reactions: optimistic } : item)),
  )
  const { data, error } = await supabase.rpc('toggle_message_reaction', {
    p_message_id: message.id,
    p_reaction: reactionKey,
  })
  if (error) {
    console.error('React message error:', formatSupabaseError(error), error)
    setMessages(previous)
    pushCelebration({ kind: 'error', title: 'Reaction not saved', detail: 'Change kept locally only.' })
    return
  }
  const row = Array.isArray(data) ? data[0] : data
  if (row) {
    const synced = normalizeReactions(row.reactions)
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, reactions: synced } : item)),
    )
  }
}

// Spin a message into a task in the active project: first line becomes the
// title, the full body the description. Safe when no project is selected.
const createTaskFromMessage = async (message) => {
  if (!userId || !currentProject) {
    pushCelebration({ kind: 'error', title: 'No project selected', detail: 'Pick a project first.' })
    return
  }
  const title = firstLine(message.text, 200) || 'Task from Campfire'
  const description = (message.text || '').trim().slice(0, 2000) || 'Created from a Campfire message.'
  const task = {
    id: crypto.randomUUID(),
    projectId: currentProject.id,
    title,
    description,
    status: 'backlog',
    priority: 'Medium',
    discipline: 'Programming',
    assignee: clampAssignee('Unassigned', teamMembers),
    sprint: currentProject.phase,
    estimate: '1 pt',
    due: 'TBD',
    completed: false,
    labels: currentProject.labels?.slice(0, 2) || [],
    subtasks: [],
    activity: [createActivity('task', 'Task created from a Campfire message.')],
  }
  setTasks((current) => [task, ...current])
  logProjectActivity(currentProject.id, 'task', `Created task ${task.title} from Campfire.`)
  const { error } = await supabase.from('tasks').insert([taskToDb(task, userId)])
  if (error) {
    console.error('Create task from message error:', formatSupabaseError(error), error)
    setTasks((current) => current.filter((item) => item.id !== task.id))
    pushCelebration({ kind: 'error', title: 'Task not saved', detail: 'Please try again.' })
    return
  }
  pushCelebration({ kind: 'xp', title: 'Task created', detail: title, icon: '✎' })
}

// Add a user-created channel under a project. Board members only (enforced by
// RLS); the channel_key encodes the project so message filtering stays scoped.
const addCampfireChannel = async (projectId, rawName) => {
  const name = (rawName || '').trim().slice(0, 40)
  if (!projectId || !name || !currentBoardId || !userId || savingChannel) return

  const key = customChannelKey(projectId, name)
  if (!key) {
    pushCelebration({ kind: 'error', title: 'Invalid channel name', detail: 'Use letters or numbers.' })
    return
  }
  // Reject duplicates (including the reserved General/default room) up front.
  if (campfireChannels.some((channel) => channel.key === key)) {
    pushCelebration({ kind: 'error', title: 'Channel exists', detail: `${name} is already a room.` })
    setNewChannelName('')
    setAddingChannelProjectId(null)
    return
  }

  setSavingChannel(true)
  const { data, error } = await supabase
    .from('campfire_channels')
    .insert({
      board_id: currentBoardId,
      project_id: projectId,
      name,
      channel_key: key,
      created_by: userId,
    })
    .select()
    .single()

  setSavingChannel(false)
  if (error) {
    console.error('Add channel error:', formatSupabaseError(error), error)
    pushCelebration({
      kind: 'error',
      title: 'Channel not added',
      detail: isMissingColumnError(error) ? 'Run the Campfire channels migration.' : 'Please try again.',
    })
    return
  }

  if (data) {
    const channel = dbToChannel(data)
    setCustomChannels((current) =>
      current.some((item) => item.id === channel.id) ? current : [...current, channel],
    )
    setCampfireChannel(channel.channelKey)
  }
  setNewChannelName('')
  setAddingChannelProjectId(null)
}

// Remove (archive) a user-created channel. Messages are preserved: we set
// archived_at rather than deleting, so the room just disappears from the list.
const removeCampfireChannel = async (channel) => {
  if (!channel?.id || !channel.removable) return

  const previous = customChannels
  setCustomChannels((current) => current.filter((item) => item.id !== channel.id))
  if (activeCampfireKey === channel.key) setCampfireChannel(BOARD_CHANNEL_KEY)

  const { error } = await supabase
    .from('campfire_channels')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', channel.id)

  if (error) {
    console.error('Remove channel error:', formatSupabaseError(error), error)
    setCustomChannels(previous)
    pushCelebration({ kind: 'error', title: 'Channel not removed', detail: 'Please try again.' })
  }
}

// ── Docs Hub handlers ────────────────────────────────────────────────────────
// Docs are metadata-only links (title + external URL), never uploaded files.
// Deletion is a soft archive so a linked doc is never silently lost. Each handler
// validates input and returns { ok, message? } so DocsView can show inline errors.
const createDoc = async (value) => {
  const result = validateDocInput(value)
  if (!result.ok) return { ok: false, message: 'Check the highlighted fields.' }
  if (!currentBoardId || !userId) return { ok: false, message: 'No active board.' }

  const { data, error } = await supabase
    .from('board_docs')
    .insert({
      board_id: currentBoardId,
      project_id: result.value.projectId,
      task_id: result.value.taskId,
      user_id: userId,
      title: result.value.title,
      url: result.value.url,
      doc_type: result.value.docType,
      description: result.value.description,
    })
    .select()
    .single()

  if (error) {
    console.error('Create doc error:', formatSupabaseError(error), error)
    return {
      ok: false,
      message: isMissingColumnError(error)
        ? 'Run the Docs Hub migration first.'
        : 'Could not link doc. Please try again.',
    }
  }

  const doc = dbToDoc(data)
  setDocs((current) => [doc, ...current])
  pushCelebration({ kind: 'xp', title: 'Doc linked', detail: doc.title })
  return { ok: true }
}

const updateDoc = async (id, value) => {
  const result = validateDocInput(value)
  if (!result.ok) return { ok: false, message: 'Check the highlighted fields.' }

  const { data, error } = await supabase
    .from('board_docs')
    .update({
      project_id: result.value.projectId,
      task_id: result.value.taskId,
      title: result.value.title,
      url: result.value.url,
      doc_type: result.value.docType,
      description: result.value.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update doc error:', formatSupabaseError(error), error)
    return { ok: false, message: 'Could not save changes. Please try again.' }
  }

  const doc = dbToDoc(data)
  setDocs((current) => current.map((item) => (item.id === doc.id ? doc : item)))
  return { ok: true }
}

// Archive (soft delete) a doc. The row stays in the database with archived_at set
// so the link is recoverable; it just drops out of the active list.
const archiveDoc = async (doc) => {
  if (!doc?.id) return { ok: false }

  const previous = docs
  setDocs((current) => current.filter((item) => item.id !== doc.id))

  const { error } = await supabase
    .from('board_docs')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', doc.id)

  if (error) {
    console.error('Archive doc error:', formatSupabaseError(error), error)
    setDocs(previous)
    pushCelebration({ kind: 'error', title: 'Doc not archived', detail: 'Please try again.' })
    return { ok: false }
  }
  return { ok: true }
}

// ── Code Forge handlers ──────────────────────────────────────────────────────
// Repos are metadata-only links (GitHub URL + parsed owner/repo), never
// credentials or code. Deletion is a soft archive so a link is never lost. Each
// handler validates input and returns { ok, message? } for inline errors.
const createRepo = async (value) => {
  const result = validateRepoInput(value)
  if (!result.ok) return { ok: false, message: 'Check the highlighted fields.' }
  if (!currentBoardId || !userId) return { ok: false, message: 'No active board.' }

  const { data, error } = await supabase
    .from('board_repositories')
    .insert({
      board_id: currentBoardId,
      project_id: result.value.projectId,
      user_id: userId,
      provider: result.value.provider,
      display_name: result.value.displayName,
      repo_url: result.value.repoUrl,
      owner: result.value.owner,
      repo: result.value.repo,
      description: result.value.description,
    })
    .select()
    .single()

  if (error) {
    console.error('Create repo error:', formatSupabaseError(error), error)
    return {
      ok: false,
      message: isMissingColumnError(error)
        ? 'Run the Code Forge migration first.'
        : 'Could not link repo. Please try again.',
    }
  }

  const repo = dbToRepo(data)
  setRepos((current) => [repo, ...current])
  pushCelebration({ kind: 'xp', title: 'Repo linked', detail: repo.displayName })
  return { ok: true }
}

const updateRepo = async (id, value) => {
  const result = validateRepoInput(value)
  if (!result.ok) return { ok: false, message: 'Check the highlighted fields.' }

  const { data, error } = await supabase
    .from('board_repositories')
    .update({
      project_id: result.value.projectId,
      provider: result.value.provider,
      display_name: result.value.displayName,
      repo_url: result.value.repoUrl,
      owner: result.value.owner,
      repo: result.value.repo,
      description: result.value.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update repo error:', formatSupabaseError(error), error)
    return { ok: false, message: 'Could not save changes. Please try again.' }
  }

  const repo = dbToRepo(data)
  setRepos((current) => current.map((item) => (item.id === repo.id ? repo : item)))
  return { ok: true }
}

// Archive (soft delete) a repo. The row stays in the database with archived_at
// set so the link is recoverable; it just drops out of the active list.
const archiveRepo = async (repo) => {
  if (!repo?.id) return { ok: false }

  const previous = repos
  setRepos((current) => current.filter((item) => item.id !== repo.id))

  const { error } = await supabase
    .from('board_repositories')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', repo.id)

  if (error) {
    console.error('Archive repo error:', formatSupabaseError(error), error)
    setRepos(previous)
    pushCelebration({ kind: 'error', title: 'Repo not archived', detail: 'Please try again.' })
    return { ok: false }
  }
  return { ok: true }
}

// ── War Room meeting notes handlers ──────────────────────────────────────────
// Notes are text-only meeting records scoped to a board and an optional
// project/huddle room. Voice huddles store nothing here; they are live-only.
const createMeetingNote = async (value) => {
  const result = validateMeetingNote(value)
  if (!result.ok) return { ok: false, message: 'Add a meeting title first.' }
  if (!currentBoardId || !userId) return { ok: false, message: 'No active board.' }

  const { data, error } = await supabase
    .from('meeting_notes')
    .insert({
      board_id: currentBoardId,
      project_id: result.value.projectId,
      room_key: result.value.roomKey,
      title: result.value.title,
      agenda: result.value.agenda,
      notes: result.value.notes,
      action_items: result.value.actionItems,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Create meeting note error:', formatSupabaseError(error), error)
    return {
      ok: false,
      message: isMissingColumnError(error)
        ? 'Run the War Room migration first.'
        : 'Could not save the meeting. Please try again.',
    }
  }

  const note = dbToMeetingNote(data)
  setMeetingNotes((current) => [note, ...current])
  pushCelebration({ kind: 'xp', title: 'Meeting saved', detail: note.title })
  return { ok: true }
}

const updateMeetingNote = async (id, value) => {
  const result = validateMeetingNote(value)
  if (!result.ok) return { ok: false, message: 'Add a meeting title first.' }

  const { data, error } = await supabase
    .from('meeting_notes')
    .update({
      project_id: result.value.projectId,
      room_key: result.value.roomKey,
      title: result.value.title,
      agenda: result.value.agenda,
      notes: result.value.notes,
      action_items: result.value.actionItems,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update meeting note error:', formatSupabaseError(error), error)
    return { ok: false, message: 'Could not save changes. Please try again.' }
  }

  const note = dbToMeetingNote(data)
  setMeetingNotes((current) => current.map((item) => (item.id === note.id ? note : item)))
  return { ok: true }
}

const archiveMeetingNote = async (note) => {
  if (!note?.id) return { ok: false }

  const previous = meetingNotes
  setMeetingNotes((current) => current.filter((item) => item.id !== note.id))

  const { error } = await supabase
    .from('meeting_notes')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', note.id)

  if (error) {
    console.error('Archive meeting note error:', formatSupabaseError(error), error)
    setMeetingNotes(previous)
    pushCelebration({ kind: 'error', title: 'Meeting not archived', detail: 'Please try again.' })
    return { ok: false }
  }
  return { ok: true }
}

// Spin an action item into a backlog task in the current project, reusing the
// same task-creation path as Campfire so board/gamification stays consistent.
const createTaskFromActionItem = async (text) => {
  const title = (text || '').trim().slice(0, 200)
  if (!title) return { ok: false }
  if (!userId || !currentProject) {
    pushCelebration({ kind: 'error', title: 'No project selected', detail: 'Pick a project first.' })
    return { ok: false }
  }
  const task = {
    id: crypto.randomUUID(),
    projectId: currentProject.id,
    title,
    description: 'Created from a War Room action item.',
    status: 'backlog',
    priority: 'Medium',
    discipline: 'Programming',
    assignee: clampAssignee('Unassigned', teamMembers),
    sprint: currentProject.phase,
    estimate: '1 pt',
    due: 'TBD',
    completed: false,
    labels: currentProject.labels?.slice(0, 2) || [],
    subtasks: [],
    activity: [createActivity('task', 'Task created from a War Room action item.')],
  }
  setTasks((current) => [task, ...current])
  logProjectActivity(currentProject.id, 'task', `Created task ${task.title} from the War Room.`)
  const { error } = await supabase.from('tasks').insert([taskToDb(task, userId)])
  if (error) {
    console.error('Create task from action item error:', formatSupabaseError(error), error)
    setTasks((current) => current.filter((item) => item.id !== task.id))
    pushCelebration({ kind: 'error', title: 'Task not saved', detail: 'Please try again.' })
    return { ok: false }
  }
  pushCelebration({ kind: 'xp', title: 'Task created', detail: title, icon: '✎' })
  return { ok: true }
}

// Render a message body from safe parsed segments (no dangerouslySetInnerHTML).
// Bold/code become styled spans; URLs become external links with rel guards.
const renderMessageBody = (text) =>
  renderMessageSegments(text).map((segment, index) => {
    if (segment.type === 'bold') return <strong key={index}>{segment.value}</strong>
    if (segment.type === 'code') return <code key={index} className="chat-code">{segment.value}</code>
    if (segment.type === 'link') {
      return (
        <a key={index} href={segment.href} target="_blank" rel="noopener noreferrer">
          {segment.value}
        </a>
      )
    }
    return <span key={index}>{segment.value}</span>
  })

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

    // Award Team Captain + first-invite XP once, guarded on the badge so later
    // invites never re-award.
    if (!hasBadge(gamificationRef.current?.badges, 'team_captain')) {
      awardGamification({
        xpDelta: XP_REWARDS.FIRST_INVITE,
        reason: 'Team Captain',
        extraStats: { inviteCount: 1 },
      })
    }

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

// Dismiss the mobile "swipe through the board" hint permanently. Hidden locally
// right away; a persistence failure (e.g. missing column) is logged but never
// blocks the board, matching dismissOnboarding.
const dismissMobileBoardHint = async () => {
  setMobileBoardHintSeen(true)
  if (!userId) return

  const seenAt = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, mobile_board_hint_seen_at: seenAt }, { onConflict: 'id' })

  if (error) console.error('Dismiss mobile board hint error:', formatSupabaseError(error), error)
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

const updateThemeToken = (key, value) => {
  setThemeSaved(false)
  setThemeError('')
  setTheme((current) => ({ ...current, [key]: value }))
}

// Persist appearance to the user's profile row. Kept separate from saveProfile
// so a missing theme_settings column never blocks saving the profile fields.
const persistThemeSettings = async (nextTheme) => {
  if (!userId || savingTheme) return

  setSavingTheme(true)
  setThemeSaved(false)
  setThemeError('')

  const themeSettings = sanitizeTheme(nextTheme)
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, theme_settings: themeSettings }, { onConflict: 'id' })
    .select('id, theme_settings')
    .single()

  if (error) {
    console.error('Save theme error:', formatSupabaseError(error), error)
    if (isMissingColumnError(error)) {
      setThemeError(
        'Your profile database is missing the theme_settings column. Apply the ' +
        'latest Supabase migrations, then try again — from the project root run ' +
        '`supabase db push` (linking first with `supabase link --project-ref <ref>` ' +
        'if the project is not linked yet). See README “Database migrations”.'
      )
    } else {
      setThemeError(`We could not save your colors. ${formatSupabaseError(error)}`)
    }
  } else {
    setMyProfile((current) => ({
      ...(current ?? { id: userId }),
      theme_settings: data?.theme_settings ?? themeSettings,
    }))
    setThemeSaved(true)
  }

  setSavingTheme(false)
}

const saveTheme = () => persistThemeSettings(theme)

// Reset applies the default immediately and persists it, so the change sticks
// across reloads without a second click.
const resetTheme = () => {
  setThemeSaved(false)
  setThemeError('')
  setTheme(defaultTheme)
  persistThemeSettings(defaultTheme)
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

const submitPasswordRecovery = async (event) => {
  event.preventDefault()
  if (recoveryStatus === 'saving') return

  const password = recoveryForm.password.trim()
  const confirm = recoveryForm.confirmPassword.trim()

  setRecoveryStatus('idle')
  setRecoveryMessage('')

  if (password.length < 6) {
    setRecoveryStatus('error')
    setRecoveryMessage('Password must be at least 6 characters.')
    return
  }
  if (password !== confirm) {
    setRecoveryStatus('error')
    setRecoveryMessage('Passwords do not match.')
    return
  }

  setRecoveryStatus('saving')

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    setRecoveryStatus('error')
    setRecoveryMessage(`We could not update your password. ${formatSupabaseError(error)}`)
    return
  }

  setRecoveryStatus('done')
  setRecoveryMessage('Your password has been updated. You can keep working — you are signed in.')
  setRecoveryForm({ password: '', confirmPassword: '' })
}

const dismissRecovery = () => {
  setRecoveryMode(false)
  setRecoveryStatus('idle')
  setRecoveryMessage('')
  setRecoveryForm({ password: '', confirmPassword: '' })
}

if (recoveryMode) {
  return (
    <div className="auth-overlay" role="presentation">
      <div
        className="auth-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        data-testid="password-recovery-panel"
      >
        <p className="eyebrow">Account security</p>
        <h2 id="recovery-title">Choose a new password</h2>
        <p className="muted-copy">
          You followed a password reset link. Set a new password below to finish.
        </p>

        <form className="auth-form" onSubmit={submitPasswordRecovery}>
          <label htmlFor="recovery-password">New password</label>
          <input
            id="recovery-password"
            type="password"
            autoComplete="new-password"
            value={recoveryForm.password}
            data-testid="recovery-password"
            onChange={(e) => setRecoveryForm((c) => ({ ...c, password: e.target.value }))}
            placeholder="At least 6 characters"
          />

          <label htmlFor="recovery-confirm">Confirm new password</label>
          <input
            id="recovery-confirm"
            type="password"
            autoComplete="new-password"
            value={recoveryForm.confirmPassword}
            data-testid="recovery-confirm"
            onChange={(e) => setRecoveryForm((c) => ({ ...c, confirmPassword: e.target.value }))}
            placeholder="Re-enter your new password"
          />

          {recoveryStatus === 'error' && recoveryMessage ? (
            <p className="auth-error" role="alert" data-testid="recovery-status">{recoveryMessage}</p>
          ) : null}
          {recoveryStatus === 'done' && recoveryMessage ? (
            <p className="auth-success" role="status" data-testid="recovery-status">{recoveryMessage}</p>
          ) : null}

          {recoveryStatus === 'done' ? (
            <button
              type="button"
              className="primary-btn"
              data-testid="recovery-continue"
              onClick={dismissRecovery}
            >
              Continue to board
            </button>
          ) : (
            <button
              type="submit"
              className="primary-btn"
              data-testid="recovery-save"
              disabled={recoveryStatus === 'saving'}
            >
              {recoveryStatus === 'saving' ? 'Updating…' : 'Update password'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
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
    <div className="celebration-region" aria-live="polite" role="status" data-testid="celebration-region">
      {celebrations.map((celebration) => (
        <div
          key={celebration.id}
          className={`celebration-toast celebration-${celebration.kind}`}
        >
          {celebration.icon ? (
            <span className="celebration-icon" aria-hidden="true">{celebration.icon}</span>
          ) : null}
          <span className="celebration-text">
            <strong className="celebration-title">{celebration.title}</strong>
            <span className="celebration-detail">{celebration.detail}</span>
          </span>
          <button
            type="button"
            className="celebration-close"
            aria-label="Dismiss notification"
            onClick={() => dismissCelebration(celebration.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
    {focusPickerOpen ? (
      <div
        className="focus-modal-overlay"
        data-testid="focus-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose today's focus quests"
        onClick={() => setFocusPickerOpen(false)}
      >
        <div className="focus-modal panel" onClick={(event) => event.stopPropagation()}>
          <div className="focus-modal-head">
            <h3>Choose today&apos;s quests</h3>
            <span className="focus-modal-count" data-testid="focus-modal-count">
              {focusDraft.length} / {MAX_DAILY_FOCUS}
            </span>
          </div>
          <p className="muted-copy">
            Pick up to {MAX_DAILY_FOCUS} tasks from {currentProject?.name || 'this project'} to focus
            on today. Completed tasks cannot be chosen.
          </p>

          {focusCandidates.length === 0 ? (
            <p className="focus-modal-empty muted-copy" data-testid="focus-modal-empty">
              No open tasks here yet. Create a task, then set your focus.
            </p>
          ) : (
            <ul className="focus-modal-list">
              {focusCandidates.map((task) => {
                const selected = focusDraft.includes(task.id)
                const atCap = !selected && focusDraft.length >= MAX_DAILY_FOCUS
                return (
                  <li key={task.id}>
                    <label className={atCap ? 'focus-option is-disabled' : 'focus-option'}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={atCap}
                        onChange={() => toggleFocusDraft(task.id)}
                        data-testid="focus-option"
                      />
                      <span className={`tour-tag tour-tag--${String(task.discipline || '').toLowerCase()}`}>
                        {task.discipline || 'Task'}
                      </span>
                      <span className="focus-option-title">{task.title}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="focus-modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setFocusPickerOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn"
              data-testid="focus-save"
              onClick={confirmFocusPicker}
            >
              Save quests
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {bossModalOpen ? (
      <div
        className="focus-modal-overlay"
        data-testid="boss-modal"
        role="dialog"
        aria-modal="true"
        aria-label={bossDraft.id ? 'Edit boss fight' : 'Create boss fight'}
        onClick={() => setBossModalOpen(false)}
      >
        <div className="focus-modal boss-modal panel" onClick={(event) => event.stopPropagation()}>
          <div className="focus-modal-head">
            <h3>{bossDraft.id ? 'Edit Boss Fight' : 'Create Boss Fight'}</h3>
          </div>
          <p className="muted-copy">Inferno rolls the weak points and reward. Name your boss and set its phase.</p>

          <label className="boss-field">
            <span className="boss-field-label">Boss name</span>
            <input
              type="text"
              value={bossDraft.name}
              maxLength={80}
              placeholder="Vertical Slice Demon"
              data-testid="boss-name-input"
              onChange={(event) => setBossDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="boss-field">
            <span className="boss-field-label">Milestone or phase</span>
            <input
              type="text"
              value={bossDraft.phase}
              maxLength={80}
              placeholder="Milestone 1"
              data-testid="boss-phase-input"
              onChange={(event) => setBossDraft((current) => ({ ...current, phase: event.target.value }))}
            />
          </label>

          <div className="boss-reward-panel" data-testid="boss-reward-preview">
            <span className="boss-field-label">Boss Reward</span>
            <span className="boss-reward-value">+{bossDraft.rewardXp} XP</span>
            <span className="boss-reward-note muted-copy">Reward generated from task difficulty.</span>
          </div>

          <div className="boss-weak-head">
            <div className="boss-field-label boss-tasks-label">
              Weak Points ({bossDraft.taskIds.length})
            </div>
            {!bossDraft.defeated ? (
              <button
                type="button"
                className="secondary-btn boss-reroll-btn"
                data-testid="boss-reroll"
                disabled={bossTaskCandidates.length === 0}
                onClick={rerollBossDraft}
              >
                Reroll
              </button>
            ) : null}
          </div>
          {bossTaskCandidates.length === 0 ? (
            <p className="focus-modal-empty muted-copy" data-testid="boss-modal-empty">
              No tasks in this project yet. Create a task, then generate a boss.
            </p>
          ) : bossDraft.taskIds.length === 0 ? (
            <p className="focus-modal-empty muted-copy" data-testid="boss-modal-empty">
              No weak points rolled. Try Reroll.
            </p>
          ) : (
            <>
              <p className="boss-weak-hint muted-copy">Inferno rolled these weak points for your boss.</p>
              <ul className="focus-modal-list">
                {bossDraft.taskIds.map((taskId) => {
                  const task = bossTaskCandidates.find((candidate) => candidate.id === taskId)
                  if (!task) return null
                  return (
                    <li key={taskId}>
                      <div className="focus-option boss-weak-preview" data-testid="boss-weak-point">
                        <span className={`tour-tag tour-tag--${String(task.discipline || '').toLowerCase()}`}>
                          {task.discipline || 'Task'}
                        </span>
                        <span className={task.completed ? 'focus-option-title is-done' : 'focus-option-title'}>
                          {task.title}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <div className="focus-modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setBossModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn"
              data-testid="boss-save"
              disabled={!bossDraft.name.trim() || bossDraft.taskIds.length === 0}
              onClick={saveBossFight}
            >
              {bossDraft.id ? 'Save Boss' : 'Generate Boss Fight'}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    <div className={`${sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}${mobileNavOpen ? ' mobile-nav-open' : ''}`}>
      <div className="mobile-topbar" data-testid="mobile-topbar">
        <button
          type="button"
          className="mobile-nav-trigger"
          data-testid="mobile-nav-trigger"
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          aria-controls="app-primary-nav"
          onClick={() => setMobileNavOpen(true)}
        >
          <MenuIcon size={22} />
        </button>
        <div className="mobile-topbar-brand">
          <InfernoLogo size={24} />
          <span>Inferno</span>
        </div>
      </div>
      <button
        type="button"
        className="mobile-nav-backdrop"
        data-testid="mobile-nav-backdrop"
        aria-label="Close menu"
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={() => setMobileNavOpen(false)}
      />
      <ProjectSidebar
        stats={stats}
        project={currentProject}
        projects={projects}
        setCurrentProjectId={setCurrentProjectId}
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={switchBoard}
        onCreateBoard={createBoard}
        creatingBoard={creatingBoard}
        onSignOut={() => supabase.auth.signOut()}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        userEmail={session?.user?.email}
        profile={myProfile}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        unreadCount={unreadNotifications}
        onOpenSearch={() => setCommandPaletteOpen(true)}
        mobileOpen={mobileNavOpen}
        onRequestClose={() => setMobileNavOpen(false)}
      />
      <main className="board-area" data-testid={`view-${activeSection}`}>
        {activeSection === 'home' ? (
          <StudioHomeView
            projects={projects}
            tasks={tasks}
            messages={messages}
            docs={docs}
            repos={repos}
            meetingNotes={meetingNotes}
            focusTasks={focusTasks}
            focusProgress={focusProgress}
            completedById={focusCompletedById}
            profiles={profiles}
            displayName={myProfile?.display_name?.trim() || ''}
            onSelectSection={handleSelectSection}
            onOpenTask={openTaskById}
          />
        ) : null}

        {activeSection === 'notifications' ? (
          <NotificationsView
            notifications={notifications}
            unread={unreadNotifications}
            migrationMissing={notificationsMigrationMissing}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
        ) : null}

        {activeSection === 'templates' ? (
          <TemplatesView
            currentProjectName={currentProject?.name || ''}
            onApply={applyTemplate}
          />
        ) : null}

        {activeSection === 'recaps' ? (
          <RecapView
            projects={projects}
            tasks={tasks}
            docs={docs}
            repos={repos}
            messages={messages}
            meetingNotes={meetingNotes}
            profiles={profiles}
          />
        ) : null}

        {activeSection === 'portfolio' ? (
          <PortfolioView
            projects={projects}
            tasks={tasks}
            docs={docs}
            repos={repos}
            meetingNotes={meetingNotes}
            messages={messages}
            profiles={profiles}
          />
        ) : null}

        {activeSection === 'board' ? (
          showOnboarding ? (
            <OnboardingGuide
              boardName={currentBoard?.name}
              projectCount={projects.length}
              taskCount={tasks.length}
              isExampleBoard={isExampleBoard}
              onDismiss={dismissOnboarding}
              onFocusCreateTask={goToCreateTask}
              onScrollToMessages={goToCampfire}
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
          <div className="mobile-board-switcher" data-testid="mobile-board-switcher">
            <label className="mobile-board-switcher-field">
              <span className="mobile-board-switcher-label">Board</span>
              <select
                className="mobile-board-select"
                data-testid="mobile-board-select"
                value={currentBoardId ?? ''}
                onChange={(e) => switchBoard(e.target.value)}
              >
                {boards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || 'Untitled board'}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary-btn mobile-board-create"
              data-testid="mobile-create-board"
              disabled={creatingBoard}
              onClick={() => createBoard()}
            >
              {creatingBoard ? 'Creating…' : 'New board'}
            </button>
          </div>
        ) : null}

        {activeSection === 'board' && userId ? (
          <section className="panel focus-quests" data-testid="focus-quests">
            <div className="focus-quests-head">
              <div className="focus-quests-title">
                <span className="focus-quests-eyebrow">Today&apos;s Quests</span>
                <span className="focus-quests-date">{todayLabel}</span>
              </div>
              {momentumStreak && momentumStreak.current > 0 ? (
                <span className="focus-momentum" data-testid="focus-momentum" title={`Best streak: ${momentumStreak.best} day${momentumStreak.best === 1 ? '' : 's'}`}>
                  <span className="focus-momentum-flame" aria-hidden="true">&#128293;</span>
                  Studio Momentum {momentumStreak.current} day{momentumStreak.current === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>

            {dailyFocusActive && focusProgress.total > 0 ? (
              <>
                <ul className="focus-list" data-testid="focus-list">
                  {focusTasks.map((task) => (
                    <li
                      key={task.id}
                      className={task.completed ? 'focus-item is-done' : 'focus-item'}
                    >
                      <span className="focus-item-check" aria-hidden="true">
                        {task.completed ? '✔' : '○'}
                      </span>
                      <span className="focus-item-title">{task.title}</span>
                    </li>
                  ))}
                </ul>
                <div className="focus-quests-meta">
                  <span className="focus-progress" data-testid="focus-progress">
                    {focusProgress.completed} / {focusProgress.total} complete
                  </span>
                  <span className={dailyFocusActive.claimed ? 'focus-reward is-claimed' : 'focus-reward'} data-testid="focus-reward">
                    {dailyFocusActive.claimed
                      ? `Bonus claimed +${DAILY_FOCUS_COMPLETE_XP} XP`
                      : `+${DAILY_FOCUS_COMPLETE_XP} XP if all complete`}
                  </span>
                </div>
              </>
            ) : (
              <p className="focus-empty muted-copy" data-testid="focus-empty">
                Pick up to {MAX_DAILY_FOCUS} tasks to focus on today and earn a
                {' '}
                +{DAILY_FOCUS_COMPLETE_XP} XP bonus for clearing them all.
              </p>
            )}

            <div className="focus-actions">
              <button
                type="button"
                className="secondary-btn"
                data-testid="focus-choose"
                onClick={openFocusPicker}
              >
                Choose Quests
              </button>
              {dailyFocusActive && focusProgress.total > 0 ? (
                <button
                  type="button"
                  className="chip-action"
                  data-testid="focus-clear"
                  onClick={clearDailyFocusSelection}
                >
                  Clear Quests
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeSection === 'board' && userId ? (
          <section className="panel boss-panel" data-testid="boss-panel">
            <div className="boss-panel-head">
              <div className="boss-panel-title">
                <span className="boss-panel-eyebrow">Boss Fights</span>
                <span className="boss-panel-sub">
                  {currentProject?.name || 'This project'}
                </span>
              </div>
              <button
                type="button"
                className="secondary-btn"
                data-testid="boss-create"
                onClick={openBossCreator}
              >
                Generate Boss Fight
              </button>
            </div>

            {projectBosses.length === 0 ? (
              <p className="boss-empty muted-copy" data-testid="boss-empty">
                Turn a milestone into a boss. Inferno rolls its weak points and
                {' '}
                reward, then defeat it for a bonus.
              </p>
            ) : (
              <ul className="boss-list" data-testid="boss-list">
                {projectBosses.map((boss) => {
                  const progress = getBossProgress(boss, focusCompletedById)
                  const defeated = boss.claimed || progress.defeated
                  const weakPoints = (Array.isArray(boss.task_ids) ? boss.task_ids : [])
                    .map((id) => tasks.find((t) => t.id === id))
                    .filter(Boolean)
                  return (
                    <li
                      key={boss.id}
                      className={defeated ? 'boss-card is-defeated' : 'boss-card'}
                      data-testid="boss-card"
                    >
                      <div className="boss-card-top">
                        <span className="boss-crest" aria-hidden="true">
                          {defeated ? '\u{1F6E1}' : '\u{1F525}'}
                        </span>
                        <div className="boss-card-headings">
                          <strong className="boss-name">{boss.name}</strong>
                          {boss.phase ? (
                            <span className="boss-phase">{boss.phase}</span>
                          ) : null}
                        </div>
                        {defeated ? (
                          <span className="boss-defeated-stamp" data-testid="boss-defeated">
                            Defeated
                          </span>
                        ) : null}
                      </div>

                      <div
                        className="boss-hp"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={progress.maxHp}
                        aria-valuenow={progress.currentHp}
                        aria-label={`${boss.name} HP`}
                      >
                        <span
                          className="boss-hp-fill"
                          data-testid="boss-hp-fill"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                      <div className="boss-card-meta">
                        <span className="boss-hp-label" data-testid="boss-hp-label">
                          {progress.currentHp} / {progress.maxHp} HP
                        </span>
                        <span className={defeated ? 'boss-reward is-claimed' : 'boss-reward'}>
                          {defeated
                            ? `Boss Defeated +${getBossRewardXp(boss)} XP`
                            : `+${getBossRewardXp(boss)} XP on defeat`}
                        </span>
                      </div>

                      {weakPoints.length > 0 ? (
                        <>
                          <span className="boss-weak-label">Weak Points</span>
                          <ul className="boss-weak-list">
                            {weakPoints.map((task) => (
                              <li
                                key={task.id}
                                className={task.completed ? 'boss-weak is-struck' : 'boss-weak'}
                              >
                                <span className="boss-weak-check" aria-hidden="true">
                                  {task.completed ? '✔' : '○'}
                                </span>
                                <span className="boss-weak-title">{task.title}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="boss-weak-empty muted-copy">
                          No linked tasks remain. Edit this boss to link tasks.
                        </p>
                      )}

                      <div className="boss-card-actions">
                        <button
                          type="button"
                          className="chip-action"
                          data-testid="boss-edit"
                          onClick={() => openBossEditor(boss)}
                        >
                          Edit Boss
                        </button>
                        <button
                          type="button"
                          className="chip-action"
                          data-testid="boss-retire"
                          onClick={() => retireBossFight(boss.id)}
                        >
                          Retire Boss
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
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
                  <DatePicker
                    value={newTask.due}
                    onChange={(iso) => setNewTask((c) => ({ ...c, due: iso }))}
                    onClear={() => setNewTask((c) => ({ ...c, due: '' }))}
                    placeholder="Due date"
                  />
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
            {!mobileBoardHintSeen ? (
              <div
                className="mobile-board-hint"
                data-testid="mobile-board-hint"
                role="status"
              >
                <span className="mobile-board-hint-icon" aria-hidden="true">↔</span>
                <p className="mobile-board-hint-copy">
                  Swipe left or right to move through your board sections and columns.
                </p>
                <button
                  type="button"
                  className="mobile-board-hint-dismiss"
                  data-testid="mobile-board-hint-dismiss"
                  aria-label="Dismiss swipe hint"
                  onClick={dismissMobileBoardHint}
                >
                  ✕
                </button>
              </div>
            ) : null}
            <div className="board-scroll-region" data-testid="board-section">
              <TaskBoard
                columns={sections}
                tasks={filteredTasks}
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
                    {availableCategories.map((item) => <option key={item}>{item}</option>)}
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
              gameCategories={availableCategories}
              deleteProject={deleteProject}
            />
            <DetailsPanel project={currentProject} tasks={tasks} labelPool={availableTags} />
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

        {activeSection === 'docs' ? (
          <DocsView
            docs={docs}
            projects={projects}
            onCreateDoc={createDoc}
            onUpdateDoc={updateDoc}
            onArchiveDoc={archiveDoc}
            migrationMissing={docsMigrationMissing}
            accessError={docsAccessError}
          />
        ) : null}

        {activeSection === 'codeforge' ? (
          <CodeForgeView
            repos={repos}
            projects={projects}
            onCreateRepo={createRepo}
            onUpdateRepo={updateRepo}
            onArchiveRepo={archiveRepo}
            migrationMissing={reposMigrationMissing}
          />
        ) : null}

        {activeSection === 'warroom' ? (
          <WarRoomView
            boardId={currentBoardId}
            self={
              userId
                ? {
                    id: userId,
                    name: profiles[userId] || session?.user?.email || 'You',
                    email: session?.user?.email || '',
                  }
                : null
            }
            projects={projects}
            notes={meetingNotes}
            migrationMissing={meetingNotesMigrationMissing}
            onCreateNote={createMeetingNote}
            onUpdateNote={updateMeetingNote}
            onArchiveNote={archiveMeetingNote}
            onCreateTaskFromAction={createTaskFromActionItem}
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
              <p className="muted-copy">
                Rename this board and update its description. Changes apply for everyone on the board.
              </p>
              <form className="profile-form" onSubmit={saveBoardInfo}>
                <label className="profile-field">
                  Board name
                  <input
                    type="text"
                    value={boardInfoForm.name}
                    data-testid="board-name-input"
                    maxLength={100}
                    placeholder="e.g. Studio Production Board"
                    onChange={(e) =>
                      setBoardInfoForm((current) => ({ ...current, name: e.target.value }))
                    }
                  />
                </label>
                <label className="profile-field">
                  Description
                  <input
                    type="text"
                    value={boardInfoForm.description}
                    data-testid="board-description-input"
                    maxLength={280}
                    placeholder="What is this board for?"
                    onChange={(e) =>
                      setBoardInfoForm((current) => ({ ...current, description: e.target.value }))
                    }
                  />
                </label>

                {boardInfoError ? <p className="auth-error">{boardInfoError}</p> : null}
                {boardInfoSaved ? (
                  <p className="auth-success" data-testid="board-info-saved">Board details saved.</p>
                ) : null}

                <button
                  type="submit"
                  className="primary-btn"
                  data-testid="settings-save-board"
                  disabled={savingBoardInfo}
                >
                  {savingBoardInfo ? 'Saving…' : 'Save board details'}
                </button>
              </form>

              <dl className="settings-list">
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

              <div className="settings-security">
                <h3>Delete board</h3>
                {isBoardOwner ? (
                  <>
                    <p className="muted-copy">
                      Permanently delete this board and all of its projects, tasks, messages, invites,
                      and members. This cannot be undone.
                    </p>
                    <button
                      type="button"
                      className="danger-btn"
                      data-testid="settings-delete-board"
                      onClick={deleteBoard}
                      disabled={deletingBoard}
                    >
                      {deletingBoard ? 'Deleting…' : 'Delete this board'}
                    </button>
                  </>
                ) : (
                  <p className="muted-copy" data-testid="settings-delete-board-locked">
                    Only the board owner can delete this board.
                  </p>
                )}
              </div>
            </div>

            <div className="panel settings-panel" data-testid="settings-customization">
              <div className="section-heading">
                <h2>Customization</h2>
              </div>
              <p className="muted-copy">
                Tailor the tags, game categories, and team roles available across this board. Built-in
                options are always available; anything you add here can be removed.
              </p>

              {[
                {
                  key: 'tags',
                  title: 'Task tags',
                  hint: 'Labels you can attach to tasks.',
                  options: availableTags,
                  placeholder: 'Add a tag (e.g. Multiplayer)',
                },
                {
                  key: 'categories',
                  title: 'Game categories',
                  hint: 'Genres available when creating or editing a project.',
                  options: availableCategories,
                  placeholder: 'Add a category (e.g. Roguelike)',
                },
                {
                  key: 'roles',
                  title: 'Team roles',
                  hint: 'Roles you can assign to members on the Team page.',
                  options: availableRoles,
                  placeholder: 'Add a role (e.g. Technical Artist)',
                },
              ].map((group) => (
                <div
                  key={group.key}
                  className="customization-group"
                  data-testid={`customization-${group.key}`}
                >
                  <div className="customization-group-heading">
                    <h3>{group.title}</h3>
                    <p className="muted-copy">{group.hint}</p>
                  </div>
                  <div className="customization-chips">
                    {group.options.map((option) => {
                      const removable = boardSettings[group.key].includes(option)
                      return (
                        <span key={option} className="customization-chip">
                          {option}
                          {removable ? (
                            <button
                              type="button"
                              className="customization-chip-remove"
                              aria-label={`Remove ${option}`}
                              data-testid={`customization-remove-${group.key}-${option}`}
                              onClick={() => removeBoardSettingValue(group.key, option)}
                            >
                              ✕
                            </button>
                          ) : null}
                        </span>
                      )
                    })}
                  </div>
                  <form
                    className="team-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      addBoardSettingValue(group.key, newBoardSetting[group.key])
                    }}
                  >
                    <input
                      value={newBoardSetting[group.key]}
                      maxLength={40}
                      placeholder={group.placeholder}
                      aria-label={group.placeholder}
                      data-testid={`customization-input-${group.key}`}
                      onChange={(e) =>
                        setNewBoardSetting((current) => ({ ...current, [group.key]: e.target.value }))
                      }
                    />
                    <button type="submit" className="secondary-btn">Add</button>
                  </form>
                </div>
              ))}
            </div>

            <div className="panel settings-panel" data-testid="settings-theme">
              <div className="section-heading">
                <h2>Appearance</h2>
              </div>
              <p className="muted-copy">
                Tap a color to customize the board, then save to keep it on your
                profile across devices. Each swatch shows the current color.
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
                        onChange={(e) => updateThemeToken(key, e.target.value)}
                      />
                    </span>
                    <span className="theme-swatch-label">{label}</span>
                  </label>
                ))}
              </div>
              {themeError ? <p className="auth-error">{themeError}</p> : null}
              {themeSaved ? (
                <p className="auth-success" data-testid="theme-saved">Colors saved.</p>
              ) : null}
              <div className="settings-actions">
                <button
                  type="button"
                  className="primary-btn"
                  data-testid="settings-save-theme"
                  onClick={saveTheme}
                  disabled={savingTheme}
                >
                  {savingTheme ? 'Saving…' : 'Save colors'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  data-testid="settings-reset-theme"
                  onClick={resetTheme}
                  disabled={savingTheme}
                >
                  Reset to default colors
                </button>
              </div>
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

            {(() => {
              const progress = levelProgress(gamification?.xp ?? 0)
              const earned = normalizeBadges(gamification?.badges)
              const earnedIds = new Set(earned.map((badge) => badge.id))
              return (
                <div className="panel settings-panel gamification-panel" data-testid="settings-gamification">
                  <div className="section-heading">
                    <h2>Progress</h2>
                  </div>
                  <p className="muted-copy">
                    Earn XP and unlock badges as you ship. Progress is saved to your profile.
                  </p>

                  <div className="gami-stat-row">
                    <div className="gami-level-badge" aria-hidden="true">
                      <span className="gami-level-num">{progress.level}</span>
                      <span className="gami-level-label">LVL</span>
                    </div>
                    <div className="gami-xp-block">
                      <div className="gami-xp-line">
                        <span data-testid="gami-total-xp">{progress.xp} XP</span>
                        <span className="muted-copy">
                          {progress.intoLevel} / {progress.needed} to level {progress.level + 1}
                        </span>
                      </div>
                      <div
                        className="gami-xp-track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress.pct}
                        aria-label={`Level ${progress.level}, ${progress.pct}% to next level`}
                      >
                        <div className="gami-xp-fill" style={{ width: `${progress.pct}%` }} />
                      </div>
                    </div>
                  </div>

                  <h3 className="gami-inventory-title">
                    Badges <span className="muted-copy">({earned.length} / {BADGES.length})</span>
                  </h3>
                  <ul className="gami-badge-grid" data-testid="gami-badge-grid">
                    {BADGES.map((badge) => {
                      const unlocked = earnedIds.has(badge.id)
                      return (
                        <li
                          key={badge.id}
                          className={`gami-badge${unlocked ? ' is-earned' : ' is-locked'}`}
                          data-rarity={badge.rarity}
                          data-earned={unlocked ? 'true' : 'false'}
                          title={`${badge.name}: ${badge.description}`}
                        >
                          <span className="gami-badge-icon" aria-hidden="true">
                            {unlocked ? badge.icon : '🔒'}
                          </span>
                          <span className="gami-badge-name">{badge.name}</span>
                          <span className="gami-badge-desc muted-copy">{badge.description}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })()}

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
                <h2>Assignable names</h2>
                <span>{teamMembers.length}</span>
              </div>
              <p className="muted-copy">
                A per-board roster of names you can assign tasks to. These labels are specific to this
                board and are separate from the people who can sign in and access it.
              </p>
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
                      <>
                        <select
                          className="member-role-select"
                          value={memberRoles[member] ?? ''}
                          aria-label={`Role for ${member}`}
                          data-testid={`member-role-${member}`}
                          onChange={(e) => updateMemberRole(member, e.target.value)}
                        >
                          <option value="">No role</option>
                          {(memberRoles[member] && !availableRoles.includes(memberRoles[member])
                            ? [memberRoles[member], ...availableRoles]
                            : availableRoles
                          ).map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        <button type="button" className="chip-action" onClick={() => removeTeamMember(member)}>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel team-manage-panel" data-testid="board-access-panel">
              <div className="section-heading">
                <h2>Members for this board</h2>
                <span>{boardMembers.length}</span>
              </div>
              <p className="muted-copy">
                People who can sign in and access <strong>{currentBoard?.name ?? 'this board'}</strong>.
                Access is board-specific — removing someone here does not affect your other boards.
                {isBoardOwner ? (
                  <> As the owner you can change roles, remove members, or transfer ownership.</>
                ) : (
                  <> Only the board owner can manage access.</>
                )}
              </p>
              <div className="member-list" data-testid="board-member-list">
                {boardMembers.map((member) => {
                  const isSelf = member.user_id === userId
                  const isMemberOwner = member.role === 'owner' || member.user_id === currentBoard?.owner_id
                  const label = profiles[member.user_id] || `${(member.user_id ?? '').slice(0, 8)}…`
                  return (
                    <div key={member.user_id} className="member-chip-row" data-testid={`board-member-${member.user_id}`}>
                      <span className="discipline-pill">
                        {label}{isSelf ? ' (you)' : ''}
                      </span>
                      {isMemberOwner ? (
                        <span className="member-owner-badge" data-testid={`board-member-owner-badge-${member.user_id}`}>
                          Owner
                        </span>
                      ) : (
                        <span className="member-role-tag">{member.role ?? 'member'}</span>
                      )}
                      {isBoardOwner && !isSelf && !isMemberOwner ? (
                        <>
                          <select
                            className="member-role-select"
                            value={member.role === 'editor' || member.role === 'viewer' ? member.role : 'editor'}
                            aria-label={`Board role for ${label}`}
                            data-testid={`board-member-role-${member.user_id}`}
                            onChange={(e) => changeBoardMemberRole(member, e.target.value)}
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            type="button"
                            className="chip-action"
                            data-testid={`board-member-transfer-${member.user_id}`}
                            onClick={() => transferBoardOwnership(member)}
                          >
                            Make owner
                          </button>
                          <button
                            type="button"
                            className="chip-action danger"
                            data-testid={`board-member-remove-${member.user_id}`}
                            onClick={() => removeBoardMember(member)}
                          >
                            Remove
                          </button>
                        </>
                      ) : null}
                    </div>
                  )
                })}
                {boardMembers.length === 0 ? (
                  <p className="muted-copy">No collaborators have joined this board yet.</p>
                ) : null}
              </div>
            </div>

        <section className="chat-panel panel" aria-label="Campfire" data-testid="chat-panel">
  <div className="chat-panel-header">
    <div>
      <p className="eyebrow">Team chat</p>
      <h3>Campfire</h3>
    </div>
    <span className="chat-count">
      {messages.length} {messages.length === 1 ? 'message' : 'messages'}
    </span>
  </div>
  <p className="muted-copy">
    Gather around the Campfire to coordinate. Board and project rooms, pins, and
    reactions all live there.
  </p>
  <button
    type="button"
    className="primary-btn"
    data-testid="team-open-campfire"
    onClick={goToCampfire}
  >
    Open Campfire
  </button>
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

        {activeSection === 'campfire' ? (
          <section className="campfire-view" data-testid="campfire-view" aria-label="Campfire">
            <header className="view-header">
              <div>
                <p className="eyebrow">Team chat</p>
                <h1>Campfire</h1>
                <p className="muted-copy">
                  Gather around the Campfire. Board and project rooms keep every conversation next to the work.
                </p>
              </div>
            </header>

            <div className="campfire-layout">
              <aside className="campfire-rooms panel" aria-label="Campfire rooms" data-testid="campfire-rooms">
                <div className="section-heading">
                  <h2>Rooms</h2>
                  <span>{campfireChannels.length}</span>
                </div>
                <div className="campfire-room-groups">
                  {campfireGroups.map((group) => {
                    const groupId = group.projectId ?? 'board'
                    const isAdding = group.projectId && addingChannelProjectId === group.projectId
                    const onlyGeneral = group.channels.length <= 1
                    return (
                      <div className="campfire-room-group" key={groupId} data-testid={`campfire-group-${groupId}`}>
                        <div className="campfire-room-group-head">
                          <p className="campfire-room-group-name">{group.projectName}</p>
                          {group.projectId ? (
                            <button
                              type="button"
                              className="campfire-add-channel-btn"
                              data-testid={`campfire-add-channel-${group.projectId}`}
                              aria-expanded={isAdding ? 'true' : 'false'}
                              aria-label={`Add channel to ${group.projectName}`}
                              onClick={() => {
                                setNewChannelName('')
                                setAddingChannelProjectId((prev) =>
                                  prev === group.projectId ? null : group.projectId,
                                )
                              }}
                            >
                              <PlusIcon size={13} />
                              <span>Add</span>
                            </button>
                          ) : null}
                        </div>
                        <ul className="campfire-room-list">
                          {group.channels.map((channel) => {
                            const count = filterMessagesByChannel(messages, channel.key).length
                            const active = channel.key === activeCampfireKey
                            return (
                              <li key={channel.key} className="campfire-room-row">
                                <button
                                  type="button"
                                  className={active ? 'campfire-room is-active' : 'campfire-room'}
                                  aria-current={active ? 'true' : undefined}
                                  data-testid={`campfire-room-${channel.key}`}
                                  onClick={() => setCampfireChannel(channel.key)}
                                >
                                  <span className="campfire-room-flame" aria-hidden="true">
                                    <FlameIcon size={14} />
                                  </span>
                                  <span className="campfire-room-name">{channel.name}</span>
                                  <span className="campfire-room-count">{count}</span>
                                </button>
                                {channel.removable ? (
                                  <button
                                    type="button"
                                    className="campfire-remove-channel"
                                    data-testid={`campfire-remove-channel-${channel.key}`}
                                    aria-label={`Remove ${channel.name} channel`}
                                    title={`Remove ${channel.name}`}
                                    onClick={() => removeCampfireChannel(channel)}
                                  >
                                    <CloseIcon size={12} />
                                  </button>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                        {isAdding ? (
                          <form
                            className="campfire-add-channel-form"
                            data-testid={`campfire-add-channel-form-${group.projectId}`}
                            onSubmit={(event) => {
                              event.preventDefault()
                              addCampfireChannel(group.projectId, newChannelName)
                            }}
                          >
                            <input
                              type="text"
                              className="campfire-add-channel-input"
                              value={newChannelName}
                              maxLength={40}
                              autoFocus
                              placeholder="Channel name"
                              aria-label={`New channel name for ${group.projectName}`}
                              data-testid="campfire-channel-name-input"
                              onChange={(event) => setNewChannelName(event.target.value)}
                            />
                            <div className="campfire-add-channel-actions">
                              <button
                                type="submit"
                                className="secondary-btn"
                                disabled={savingChannel || !newChannelName.trim()}
                                data-testid="campfire-channel-save"
                              >
                                {savingChannel ? 'Adding…' : 'Add channel'}
                              </button>
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => {
                                  setAddingChannelProjectId(null)
                                  setNewChannelName('')
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            {onlyGeneral ? (
                              <div className="campfire-channel-suggestions">
                                <span className="campfire-suggestion-label">Quick add</span>
                                {DEFAULT_CHANNEL_SUGGESTIONS.map((suggestion) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    className="campfire-suggestion-chip"
                                    disabled={savingChannel}
                                    data-testid={`campfire-suggestion-${suggestion.toLowerCase()}`}
                                    onClick={() => addCampfireChannel(group.projectId, suggestion)}
                                  >
                                    <PlusIcon size={11} />
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </form>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </aside>

              <div className="campfire-feed-wrap panel" data-testid="campfire-feed">
                <div className="campfire-feed-head">
                  <div>
                    <p className="eyebrow">{activeCampfireChannel?.projectId ? 'Project room' : 'Board room'}</p>
                    <h2>{activeCampfireChannel?.name || 'Board Campfire'}</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn campfire-context-toggle"
                    aria-expanded={campfireContextOpen}
                    data-testid="campfire-context-toggle"
                    onClick={() => setCampfireContextOpen((open) => !open)}
                  >
                    {campfireContextOpen ? 'Hide details' : 'Details'}
                  </button>
                </div>

                <div className="chat-messages campfire-messages" role="log" aria-live="polite">
                  {campfireMessages.length ? (
                    <>
                      {campfireMessages.map((message) => {
                        const isSelf = message.userId === userId
                        const isEditing = editingMessageId === message.id
                        return (
                          <article
                            key={message.id}
                            className={isSelf ? 'chat-message campfire-message self' : 'chat-message campfire-message'}
                            data-testid="campfire-message"
                          >
                            <div className="chat-message-meta">
                              <span className="chat-message-author">{getMessageAuthorLabel(message)}</span>
                              <span className="chat-message-meta-end">
                                {message.pinned ? <span className="campfire-pin-tag">Pinned</span> : null}
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
                                  <button type="button" className="secondary-btn chip-action" onClick={cancelEditingMessage}>
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <p className="campfire-message-body">{renderMessageBody(message.text)}</p>

                                <div className="campfire-reactions" data-testid="campfire-reactions">
                                  {CAMPFIRE_REACTIONS.map((reaction) => {
                                    const count = reactionCount(message.reactions, reaction.key)
                                    const mine = hasReacted(message.reactions, reaction.key, userId)
                                    return (
                                      <button
                                        key={reaction.key}
                                        type="button"
                                        className={mine ? 'campfire-reaction is-mine' : 'campfire-reaction'}
                                        data-testid={`campfire-reaction-${reaction.key}`}
                                        aria-pressed={mine}
                                        aria-label={`${reaction.label} reaction${count ? `, ${count}` : ''}`}
                                        onClick={() => toggleMessageReaction(message, reaction.key)}
                                      >
                                        <span className="campfire-reaction-glyph" aria-hidden="true">{reaction.glyph}</span>
                                        <span className="campfire-reaction-label">{reaction.label}</span>
                                        {count > 0 ? <span className="campfire-reaction-count">{count}</span> : null}
                                      </button>
                                    )
                                  })}
                                </div>

                                <div className="chat-message-actions">
                                  <button
                                    type="button"
                                    className="chat-action-btn"
                                    data-testid="campfire-pin"
                                    onClick={() => toggleMessagePin(message)}
                                  >
                                    {message.pinned ? 'Unpin' : 'Pin'}
                                  </button>
                                  <button
                                    type="button"
                                    className="chat-action-btn"
                                    data-testid="campfire-create-task"
                                    onClick={() => createTaskFromMessage(message)}
                                  >
                                    Create task
                                  </button>
                                  {isSelf ? (
                                    <>
                                      <button type="button" className="chat-action-btn" onClick={() => startEditingMessage(message)}>
                                        Edit
                                      </button>
                                      <button type="button" className="chat-action-btn danger" onClick={() => deleteMessage(message)}>
                                        Delete
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </article>
                        )
                      })}
                      <div ref={chatMessagesEndRef} />
                    </>
                  ) : (
                    <div className="chat-empty campfire-empty" data-testid="campfire-empty">
                      No sparks yet. Start the campfire.
                    </div>
                  )}
                </div>

                <form className="chat-form campfire-form" onSubmit={sendMessage}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${activeCampfireChannel?.name || 'the Campfire'}`}
                    aria-label={`Message ${activeCampfireChannel?.name || 'the Campfire'}`}
                    maxLength={2000}
                    rows={2}
                    data-testid="campfire-composer"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(e)
                      }
                    }}
                  />
                  <button type="submit" className="primary-btn" disabled={sendingMessage || !newMessage.trim()}>
                    {sendingMessage ? 'Sending…' : 'Send'}
                  </button>
                </form>
                <p className="campfire-hint muted-copy">
                  Enter sends. Shift+Enter adds a line. Use **bold**, `code`, and links are auto-detected.
                </p>
              </div>

              <aside
                className={campfireContextOpen ? 'campfire-context panel is-open' : 'campfire-context panel'}
                aria-label="Campfire details"
                data-testid="campfire-context"
              >
                <div className="campfire-context-block">
                  <div className="section-heading">
                    <h2>Pinned</h2>
                    <span>{pinnedCampfireMessages.length}</span>
                  </div>
                  {pinnedCampfireMessages.length ? (
                    <ul className="campfire-pin-list">
                      {pinnedCampfireMessages.map((message) => (
                        <li key={message.id} className="campfire-pin-item" data-testid="campfire-pinned-item">
                          <span className="campfire-pin-author">{getMessageAuthorLabel(message)}</span>
                          <span className="campfire-pin-text">{firstLine(message.text, 90) || 'Message'}</span>
                          <button
                            type="button"
                            className="chat-action-btn"
                            onClick={() => toggleMessagePin(message)}
                          >
                            Unpin
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-copy">No pinned messages yet. Pin a message to keep it handy.</p>
                  )}
                </div>

                <div className="campfire-context-block">
                  <div className="section-heading">
                    <h2>Around the fire</h2>
                    <span>{onlineUsers.length}</span>
                  </div>
                  {onlineUsers.length ? (
                    <ul className="campfire-online-list">
                      {onlineUsers.map((online) => (
                        <li key={online.userId} className="campfire-online-item" data-testid="campfire-online-item">
                          <span className="campfire-online-dot" aria-hidden="true" />
                          <span>{profiles[online.userId] || online.email || 'Teammate'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-copy">No one else is online right now.</p>
                  )}
                </div>

                <div className="campfire-context-block">
                  <div className="section-heading">
                    <h2>Quick tips</h2>
                  </div>
                  <ul className="campfire-tips">
                    <li>Switch rooms to keep board and project chatter separate.</li>
                    <li>Pin decisions so nobody loses them.</li>
                    <li>Turn any message into a task with Create task.</li>
                  </ul>
                </div>
              </aside>
            </div>
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
      labelPool={availableTags}
      projects={projects}
      deleteTask={deleteTask}
      addSubtaskToEditing={addSubtaskToEditing}
    />

    <CommandPalette
      open={commandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      data={{ tasks, projects, docs, repos, messages, boardMembers, profiles, meetingNotes }}
      onSelectSection={handleSelectSection}
      onOpenTask={openTaskById}
      onQuickAction={runQuickAction}
    />
  </>
)
}

export default App