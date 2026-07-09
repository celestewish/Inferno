export const defaultTheme = {
  accent: '#7c5cff',
  accentSecondary: '#39d0c4',
  surface: '#12192d',
  background: '#0f1220',
}

// The only theme tokens we read from / write to profiles.theme_settings. Acts
// as an allowlist so unknown or malicious keys in stored JSON are ignored.
export const themeTokenKeys = Object.keys(defaultTheme)

// Coerce an arbitrary stored value into a safe theme object: keep only known
// token keys whose value is a non-empty string, and fall back to the default
// for anything missing or malformed.
export function sanitizeTheme(stored) {
  const theme = { ...defaultTheme }
  if (stored && typeof stored === 'object') {
    for (const key of themeTokenKeys) {
      const value = stored[key]
      if (typeof value === 'string' && value.trim()) theme[key] = value.trim()
    }
  }
  return theme
}

export const defaultTeamMembers = ['Celeste', 'Unassigned']

// Default Kanban sections (columns / status lanes) for a new board.
// Boards persist their own sections in boards.kanban_sections; this is the
// fallback used for seeding and for older boards missing the column.
export const columns = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

export const defaultSections = columns

// Fallback status used when a section is removed while it still holds tasks.
export const FALLBACK_STATUS = 'backlog'

// Turn a human label into a stable, unique section id.
export const slugifySection = (label, existingIds = []) => {
  const base =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  let id = base
  let n = 2
  while (existingIds.includes(id)) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

// Merge a board's saved sections with any task statuses that aren't covered,
// so existing/unknown statuses always render as a lane instead of disappearing.
export const resolveSections = (savedSections, tasks = []) => {
  const base =
    Array.isArray(savedSections) && savedSections.length ? savedSections : defaultSections
  const known = new Set(base.map((section) => section.id))
  const orphanStatuses = [
    ...new Set(tasks.map((task) => task.status).filter((status) => status && !known.has(status))),
  ]
  const orphanSections = orphanStatuses.map((status) => ({
    id: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  }))
  return [...base, ...orphanSections]
}

export const methodologies = ['Agile Sprint', 'Kanban', 'Vertical Slice', 'Milestone Driven', 'Playtest Driven']
export const gameCategories = ['Educational', 'Horror', 'Strategy', 'Narrative', 'Hyper-Casual', 'Adventure', 'FPS', 'Action']
export const disciplines = ['Programming', 'Design', 'Art', 'UI / UX', 'Audio', 'QA', 'Narrative']
export const priorities = ['High', 'Medium', 'Low']
export const labelPool = ['Combat', 'AI', 'UI', 'Boss', 'Narrative', 'Tutorial', 'Accessibility', 'Playtest']

// Default team role labels offered when a board has no custom roles set.
export const defaultRoles = ['Programmer', 'Artist', 'Designer', 'Producer', 'QA', 'Audio']

// The customizable lists stored in boards.settings. Each maps to a UI list that
// merges the built-in defaults with the board's user-defined entries.
export const boardSettingKeys = ['tags', 'categories', 'roles']

// Coerce an arbitrary value into a clean list of unique, trimmed, non-empty
// strings. Caps entries and length so a malformed or hostile settings blob can
// never blow up the UI.
export function sanitizeStringList(value, { max = 60, maxLength = 40 } = {}) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const list = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim().slice(0, maxLength)
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    list.push(trimmed)
    if (list.length >= max) break
  }
  return list
}

// Normalize a stored boards.settings blob into a predictable shape so the app
// can read board.settings.tags / .categories / .roles without guarding each
// access. Unknown keys are dropped.
export function sanitizeBoardSettings(stored) {
  const settings = {}
  const source = stored && typeof stored === 'object' ? stored : {}
  for (const key of boardSettingKeys) {
    settings[key] = sanitizeStringList(source[key])
  }
  return settings
}

// Merge built-in defaults with a board's custom entries, preserving default
// order first and dropping case-insensitive duplicates.
export function mergeWithDefaults(defaults, custom = []) {
  const seen = new Set()
  const merged = []
  for (const item of [...defaults, ...custom]) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
  }
  return merged
}

export const createActivity = (type, text, actor = 'You') => ({
  id: crypto.randomUUID(),
  type,
  text,
  actor,
  timestamp: new Date().toISOString(),
})

export const defaultProjects = [
  {
    id: 'project-gamma',
    name: 'Gamma Guardian',
    tagline: 'Immune-defense strategy project with educational design constraints.',
    category: 'Educational',
    methodology: 'Agile Sprint',
    targetPlatform: 'Mobile',
    phase: 'Vertical Slice',
    pillars: ['Readable AI', 'No frustration loops', 'Replayable encounters'],
    labels: ['AI', 'Tutorial', 'Playtest'],
    activity: [
      createActivity('project', 'Created project space for Gamma Guardian.'),
      createActivity('settings', 'Set methodology to Agile Sprint and phase to Vertical Slice.'),
    ],
  },
  {
    id: 'project-house',
    name: 'The House Watches',
    tagline: 'Strategy horror prototype focused on tension, systems, and player readability.',
    category: 'Horror',
    methodology: 'Vertical Slice',
    targetPlatform: 'PC',
    phase: 'Alpha Demo',
    pillars: ['Atmosphere', 'High tension', 'Readable interactions'],
    labels: ['Narrative', 'UI', 'Boss'],
    activity: [createActivity('project', 'Created project space for The House Watches.')],
  },
]

export const defaultTasks = [
  {
    id: 'task-1',
    projectId: 'project-gamma',
    title: 'Implement enemy patrol state',
    description: 'Create waypoint movement and idle wait timing for the cemetery enemies.',
    status: 'backlog',
    priority: 'High',
    discipline: 'Programming',
    assignee: 'Celeste',
    sprint: 'Vertical Slice',
    estimate: '5 pts',
    due: 'Jun 20',
    completed: false,
    labels: ['AI', 'Combat'],
    subtasks: [
      { id: crypto.randomUUID(), title: 'Create patrol spline', done: true },
      { id: crypto.randomUUID(), title: 'Add idle wait timer', done: false },
    ],
    activity: [createActivity('task', 'Task created and added to backlog.')],
  },
  {
    id: 'task-2',
    projectId: 'project-gamma',
    title: 'Hook combat hit flash into UI feedback',
    description: 'Sync damage feedback with screen vignette and enemy hurt animation events.',
    status: 'todo',
    priority: 'Medium',
    discipline: 'UI / UX',
    assignee: 'Celeste',
    sprint: 'Vertical Slice',
    estimate: '3 pts',
    due: 'Jun 22',
    completed: false,
    labels: ['UI', 'Combat'],
    subtasks: [{ id: crypto.randomUUID(), title: 'Tune flash duration', done: false }],
    activity: [createActivity('task', 'Task created and assigned to Celeste.')],
  },
  {
    id: 'task-3',
    projectId: 'project-house',
    title: 'Fix quest log overflow on 16:10',
    description: 'Adjust panel layout and scrolling so long objectives stay readable.',
    status: 'review',
    priority: 'High',
    discipline: 'UI / UX',
    assignee: 'Celeste',
    sprint: 'Alpha Demo',
    estimate: '2 pts',
    due: 'Jun 19',
    completed: false,
    labels: ['UI', 'Accessibility'],
    subtasks: [{ id: crypto.randomUUID(), title: 'Check Steam Deck safe area', done: false }],
    activity: [createActivity('task', 'Task entered review after layout pass.')],
  },
]
