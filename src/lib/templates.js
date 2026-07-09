// Static template definitions for the Templates library. Each template is a
// starter pack of tasks (and, where relevant, suggested docs) a team can apply
// to a project to skip the blank-page problem. Definitions live in code (no
// table needed for the MVP); applying a template turns its task specs into real
// task rows via buildTemplateTasks, which stamps ids and fills the standard task
// shape so they persist through the normal task-creation path.
//
// Disciplines and priorities intentionally match src/data/defaultData.js so
// generated tasks render with the right lane colors and filters.

// A task spec is the minimal per-task data a template carries. buildTemplateTasks
// expands each into a full task object.
const t = (title, discipline, priority = 'Medium', description = '') => ({
  title,
  discipline,
  priority,
  description,
})

export const TEMPLATES = [
  {
    id: 'game-jam-board',
    name: 'Game Jam Board',
    kind: 'board',
    summary: 'A tight 48 hour jam plan: scope, build, polish, submit.',
    docs: [{ title: 'Jam theme and pitch', docType: 'Design' }],
    tasks: [
      t('Lock the pitch and scope', 'Design', 'High', 'One sentence hook plus a cut list.'),
      t('Grey-box the core loop', 'Programming', 'High'),
      t('Placeholder art and audio pass', 'Art', 'Medium'),
      t('First playable build', 'Programming', 'High'),
      t('Playtest and cut scope', 'QA', 'High'),
      t('Juice and polish pass', 'Design', 'Medium'),
      t('Build submission page and trailer gif', 'UI / UX', 'Medium'),
      t('Submit before the deadline', 'Design', 'High'),
    ],
  },
  {
    id: 'rpg-project',
    name: 'RPG Project',
    kind: 'project',
    summary: 'Systems-heavy RPG starter: combat, progression, content, save.',
    docs: [{ title: 'Systems design overview', docType: 'Design' }],
    tasks: [
      t('Define core stats and progression', 'Design', 'High'),
      t('Turn-based combat prototype', 'Programming', 'High'),
      t('Inventory and equipment system', 'Programming', 'Medium'),
      t('Quest and dialogue framework', 'Narrative', 'Medium'),
      t('Character and enemy art pass', 'Art', 'Medium'),
      t('Save and load system', 'Programming', 'High'),
      t('World map and zone layout', 'Design', 'Medium'),
      t('Balance pass on encounters', 'QA', 'Medium'),
    ],
  },
  {
    id: 'platformer-project',
    name: 'Platformer Project',
    kind: 'project',
    summary: 'Tight-controls platformer: movement, levels, hazards, feel.',
    tasks: [
      t('Character controller and jump feel', 'Programming', 'High'),
      t('Camera and follow tuning', 'Programming', 'Medium'),
      t('Tileset and level building blocks', 'Art', 'Medium'),
      t('Hazards and moving platforms', 'Programming', 'Medium'),
      t('Collectibles and scoring', 'Design', 'Low'),
      t('Level 1 whitebox', 'Design', 'High'),
      t('Enemy patterns', 'Programming', 'Medium'),
      t('Sound effects and jump audio', 'Audio', 'Low'),
    ],
  },
  {
    id: 'horror-game-project',
    name: 'Horror Game Project',
    kind: 'project',
    summary: 'Atmosphere-first horror: tension, AI, lighting, sound.',
    docs: [{ title: 'Tone and scare beats', docType: 'Design' }],
    tasks: [
      t('First person controller and interaction', 'Programming', 'High'),
      t('Stalker AI and detection', 'Programming', 'High'),
      t('Lighting and fog atmosphere pass', 'Art', 'High'),
      t('Ambient and stinger audio', 'Audio', 'High'),
      t('Inventory and item puzzles', 'Design', 'Medium'),
      t('Save points and checkpoints', 'Programming', 'Medium'),
      t('Scare beat scripting', 'Narrative', 'Medium'),
      t('Playtest for tension pacing', 'QA', 'Medium'),
    ],
  },
  {
    id: 'gdd',
    name: 'Game Design Document',
    kind: 'doc-pack',
    summary: 'A GDD scaffold plus the tasks to fill each section.',
    docs: [{ title: 'Game Design Document', docType: 'GDD' }],
    tasks: [
      t('Write the high concept and pillars', 'Design', 'High'),
      t('Document core gameplay loop', 'Design', 'High'),
      t('Define mechanics and systems', 'Design', 'Medium'),
      t('Art direction and reference board', 'Art', 'Medium'),
      t('Audio direction notes', 'Audio', 'Low'),
      t('Scope, milestones, and risks', 'Design', 'Medium'),
    ],
  },
  {
    id: 'qa-checklist',
    name: 'QA Checklist',
    kind: 'checklist',
    summary: 'A release-readiness QA sweep before you ship a build.',
    tasks: [
      t('Smoke test the main flow', 'QA', 'High'),
      t('Verify save and load integrity', 'QA', 'High'),
      t('Check all input devices', 'QA', 'Medium'),
      t('Audio and subtitle pass', 'QA', 'Medium'),
      t('Performance and frame rate check', 'QA', 'Medium'),
      t('Accessibility options review', 'QA', 'Medium'),
      t('Build and packaging verification', 'QA', 'High'),
    ],
  },
  {
    id: 'sprint-vertical-slice',
    name: 'Sprint / Vertical Slice',
    kind: 'sprint',
    summary: 'A two week slice that proves the game is fun end to end.',
    docs: [{ title: 'Vertical slice goals', docType: 'Design' }],
    tasks: [
      t('Define the slice goal and success criteria', 'Design', 'High'),
      t('Build the one representative level', 'Design', 'High'),
      t('Implement the core mechanic fully', 'Programming', 'High'),
      t('Production-quality art for the slice', 'Art', 'Medium'),
      t('Music and sound for the slice', 'Audio', 'Medium'),
      t('Onboarding and first minute', 'UI / UX', 'Medium'),
      t('Playtest and iterate', 'QA', 'High'),
      t('Slice review and retro', 'Design', 'Low'),
    ],
  },
]

export function getTemplate(id) {
  return TEMPLATES.find((tpl) => tpl.id === id) || null
}

// Expand a template's task specs into full task objects for a given project.
// `makeId` and `makeActivity` are injected so this stays pure and testable; the
// app passes crypto.randomUUID and its createActivity helper.
export function buildTemplateTasks(template, { projectId, sprint = '', makeId, makeActivity } = {}) {
  if (!template || !projectId) return []
  const genId = typeof makeId === 'function' ? makeId : () => `tpl_${Math.random().toString(36).slice(2)}`
  const genActivity =
    typeof makeActivity === 'function'
      ? makeActivity
      : () => ({ type: 'task', note: 'Task created from a template.' })
  return (template.tasks || []).map((spec) => ({
    id: genId(),
    projectId,
    title: spec.title,
    description: spec.description || '',
    status: 'backlog',
    priority: spec.priority || 'Medium',
    discipline: spec.discipline || 'Programming',
    assignee: 'Unassigned',
    sprint: sprint || '',
    estimate: '1 pt',
    due: 'TBD',
    completed: false,
    labels: [],
    subtasks: [],
    activity: [genActivity('task', `Task created from the ${template.name} template.`)],
    codeRefs: [],
    docRefs: [],
  }))
}

// Count of tasks a template will create, for the confirm prompt.
export function templateTaskCount(template) {
  return template && Array.isArray(template.tasks) ? template.tasks.length : 0
}
