// Sanity checks for the Templates library helpers. Run with
// `node scripts/templates-sanity.mjs`. Exits non-zero on failure.
import {
  TEMPLATES,
  getTemplate,
  buildTemplateTasks,
  templateTaskCount,
} from '../src/lib/templates.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

const requiredIds = [
  'game-jam-board',
  'rpg-project',
  'platformer-project',
  'horror-game-project',
  'gdd',
  'qa-checklist',
  'sprint-vertical-slice',
]

assert(TEMPLATES.length === requiredIds.length, 'all seven templates are defined')
for (const id of requiredIds) {
  assert(Boolean(getTemplate(id)), `template ${id} is present`)
}
assert(getTemplate('nope') === null, 'getTemplate returns null for unknown id')

const validDisciplines = new Set(['Programming', 'Design', 'Art', 'UI / UX', 'Audio', 'QA', 'Narrative'])
const validPriorities = new Set(['High', 'Medium', 'Low'])
let allValid = true
for (const tpl of TEMPLATES) {
  assert(tpl.tasks.length > 0, `template ${tpl.id} has tasks`)
  for (const task of tpl.tasks) {
    if (!validDisciplines.has(task.discipline)) allValid = false
    if (!validPriorities.has(task.priority)) allValid = false
  }
}
assert(allValid, 'every task uses a valid discipline and priority')

const jam = getTemplate('game-jam-board')
assert(templateTaskCount(jam) === jam.tasks.length, 'templateTaskCount matches task list length')

let n = 0
const built = buildTemplateTasks(jam, {
  projectId: 'p1',
  sprint: 'Jam',
  makeId: () => `id-${n++}`,
  makeActivity: (type, note) => ({ type, note }),
})
assert(built.length === jam.tasks.length, 'buildTemplateTasks expands every spec')
assert(built.every((task) => task.projectId === 'p1'), 'buildTemplateTasks stamps the project id')
assert(built.every((task) => task.status === 'backlog' && task.completed === false), 'built tasks start in backlog, incomplete')
assert(built.every((task) => Array.isArray(task.codeRefs) && Array.isArray(task.docRefs)), 'built tasks carry empty link arrays')
assert(built[0].id === 'id-0' && built[1].id === 'id-1', 'buildTemplateTasks uses the injected id maker')
assert(built[0].activity[0].note.includes('Game Jam Board'), 'built task activity names the template')

assert(buildTemplateTasks(null, { projectId: 'p1' }).length === 0, 'buildTemplateTasks tolerates a missing template')
assert(buildTemplateTasks(jam, {}).length === 0, 'buildTemplateTasks requires a project id')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll Templates helper checks passed.')
