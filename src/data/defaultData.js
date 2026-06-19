export const defaultTheme = {
  accent: '#7c5cff',
  accentSecondary: '#39d0c4',
  surface: '#12192d',
  background: '#0f1220',
}

export const defaultTeamMembers = ['Celeste', 'Unassigned']

export const columns = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

export const methodologies = ['Agile Sprint', 'Kanban', 'Vertical Slice', 'Milestone Driven', 'Playtest Driven']
export const gameCategories = ['Educational', 'Horror', 'Strategy', 'Narrative', 'Hyper-Casual', 'Adventure', 'FPS', 'Strategy', 'Action']
export const disciplines = ['Programming', 'Design', 'Art', 'UI / UX', 'Audio', 'QA', 'Narrative']
export const priorities = ['High', 'Medium', 'Low']
export const labelPool = ['Combat', 'AI', 'UI', 'Boss', 'Narrative', 'Tutorial', 'Accessibility', 'Playtest']

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
