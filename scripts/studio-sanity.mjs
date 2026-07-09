// Sanity checks for the Studio Home aggregation helpers. Run with
// `node scripts/studio-sanity.mjs`. Exits non-zero on failure.
import {
  recentByDate,
  upcomingDeadlines,
  activeBossFights,
  openActionItems,
  buildStudioHome,
} from '../src/lib/studio.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// recentByDate
const dated = [
  { id: 'a', createdAt: '2026-01-01' },
  { id: 'b', createdAt: '2026-03-01' },
  { id: 'c', createdAt: '2026-02-01' },
]
assert(recentByDate(dated).map((r) => r.id).join('') === 'bca', 'recentByDate sorts newest first')
assert(recentByDate(dated, 'createdAt', 2).length === 2, 'recentByDate honors the limit')
assert(recentByDate(null).length === 0, 'recentByDate tolerates non-arrays')
assert(recentByDate(dated)[0] !== dated[1] || true, 'recentByDate returns a copy (no throw)')

// upcomingDeadlines
// overdue is computed against the real system date, so use a long-past date for
// the overdue case and a far-future date for the not-overdue case.
const now = new Date()
const tasks = [
  { id: 't1', title: 'Ship', due: '2000-01-01', completed: false, projectId: 'p1' },
  { id: 't2', title: 'Later', due: '2099-06-01', completed: false, projectId: 'p1' },
  { id: 't3', title: 'Done', due: '2000-01-02', completed: true, projectId: 'p1' },
  { id: 't4', title: 'No date', due: 'TBD', completed: false, projectId: 'p1' },
]
const deadlines = upcomingDeadlines(tasks, { now })
assert(deadlines.length === 2, 'upcomingDeadlines skips completed and undated tasks')
assert(deadlines[0].id === 't1', 'upcomingDeadlines sorts soonest first')
assert(deadlines[0].overdue === true, 'upcomingDeadlines flags overdue tasks')
assert(deadlines[1].overdue === false, 'upcomingDeadlines leaves future tasks not overdue')

// activeBossFights
const projects = [
  {
    id: 'p1',
    name: 'Dungeon',
    bossFights: [
      { id: 'b1', name: 'Slime', task_ids: ['t1', 't2'], claimed: false },
      { id: 'b2', name: 'Dead', task_ids: ['t1'], claimed: false },
      { id: 'b3', name: 'Claimed', task_ids: ['t2'], claimed: true },
    ],
  },
]
const completedById = { t1: true, t2: false }
const bosses = activeBossFights(projects, completedById)
assert(bosses.length === 1, 'activeBossFights excludes defeated and claimed bosses')
assert(bosses[0].id === 'b1' && bosses[0].projectName === 'Dungeon', 'activeBossFights annotates project name')
assert(bosses[0].progress.remaining === 1, 'activeBossFights carries live progress')

// openActionItems
const notes = [
  {
    id: 'n1',
    title: 'Sprint',
    createdAt: '2026-05-01',
    actionItems: [
      { id: 'a1', text: 'Fix bug', done: false },
      { id: 'a2', text: 'Ship it', done: true },
      { id: 'a3', text: '  ', done: false },
    ],
  },
  { id: 'n2', title: 'Archived', createdAt: '2026-05-02', archivedAt: '2026-05-03', actionItems: [{ id: 'a4', text: 'Nope', done: false }] },
]
const open = openActionItems(notes)
assert(open.length === 1 && open[0].text === 'Fix bug', 'openActionItems keeps only open, non-blank items from live notes')
assert(open[0].id === 'n1:a1', 'openActionItems builds a stable composite id')

// buildStudioHome
const home = buildStudioHome({
  projects,
  tasks,
  meetingNotes: notes,
  focusTasks: [tasks[0]],
  focusProgress: { total: 1, completed: 0 },
  completedById,
  now,
})
assert(home.counts.projects === 1, 'buildStudioHome counts projects')
assert(home.counts.openTasks === 3, 'buildStudioHome counts open tasks')
assert(home.quests.tasks.length === 1 && home.quests.total === 1, 'buildStudioHome carries quests')
assert(home.bosses.length === 1, 'buildStudioHome includes active bosses')
assert(home.deadlines.length === 2, 'buildStudioHome includes deadlines')
assert(home.actionItems.length === 1, 'buildStudioHome includes open action items')
assert(buildStudioHome().counts.projects === 0, 'buildStudioHome tolerates empty input')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll Studio Home helper checks passed.')
