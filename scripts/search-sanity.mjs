// Sanity checks for the global search + command palette helpers. Run with
// `node scripts/search-sanity.mjs`. Exits non-zero on failure.
import {
  RESULT_TYPES,
  buildSearchIndex,
  searchIndex,
  quickActions,
  filterQuickActions,
} from '../src/lib/search.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

const index = buildSearchIndex({
  tasks: [
    { id: 't1', title: 'Fix boss HP bar', description: 'render glitch', projectId: 'p1', discipline: 'Engineering', labels: ['ui'] },
    { id: 't2', title: 'Write GDD intro', projectId: 'p1' },
  ],
  projects: [{ id: 'p1', name: 'Ember Quest', tagline: 'A cozy RPG', category: 'RPG' }],
  docs: [
    { id: 'd1', title: 'Game Design Document', docType: 'GDD', url: 'https://docs.dev/gdd' },
    { id: 'd2', title: 'Archived doc', archivedAt: '2026-01-01' },
  ],
  repos: [{ id: 'r1', displayName: 'ember-client', repo: 'ember-client', owner: 'studio', repoUrl: 'https://github.com/studio/ember-client' }],
  messages: [
    { id: 'm1', text: 'Remember to test the boss fight', userId: 'u1' },
    { id: 'm2', text: '   ', userId: 'u1' },
  ],
  boardMembers: [
    { user_id: 'u1', role: 'owner' },
    { user_id: 'u1', role: 'owner' },
  ],
  profiles: { u1: 'Riley' },
  meetingNotes: [
    {
      id: 'n1',
      title: 'Sprint kickoff',
      notes: 'Discussed the vertical slice',
      actionItems: [{ id: 'a1', text: 'Draft the QA checklist' }],
    },
    { id: 'n2', title: 'Archived note', archivedAt: '2026-01-01', actionItems: [{ id: 'a2', text: 'Nope' }] },
  ],
})

assert(index.some((e) => e.type === RESULT_TYPES.TASK && e.taskId === 't1'), 'index includes tasks with taskId')
assert(!index.some((e) => e.key === 'doc:d2'), 'index excludes archived docs')
assert(!index.some((e) => e.key === 'note:n2'), 'index excludes archived notes')
assert(!index.some((e) => e.key === 'message:m2'), 'index excludes blank messages')
assert(index.filter((e) => e.type === RESULT_TYPES.MEMBER).length === 1, 'index dedupes board members')
assert(index.some((e) => e.key === 'action:n1:a1'), 'index includes meeting action items')

const bossHits = searchIndex(index, 'boss')
assert(bossHits.length >= 2, 'search finds task and message mentioning boss')
assert(bossHits[0].taskId === 't1', 'title-prefix match ranks first')

assert(searchIndex(index, '').length === 0, 'empty query returns nothing')
assert(searchIndex(index, 'ember').some((e) => e.type === RESULT_TYPES.PROJECT || e.type === RESULT_TYPES.REPO), 'search spans projects and repos')
assert(searchIndex(index, 'riley').some((e) => e.type === RESULT_TYPES.MEMBER), 'search finds members by name')
assert(searchIndex(index, 'qa checklist').some((e) => e.type === RESULT_TYPES.ACTION), 'search finds action items')
assert(searchIndex(index, 'zznomatch').length === 0, 'no match returns empty')

assert(quickActions().length === 6, 'six quick actions defined')
assert(filterQuickActions('boss').some((a) => a.id === 'create-boss'), 'quick actions filter by query')
assert(filterQuickActions('').length === 6, 'empty query returns all quick actions')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll search helper checks passed.')
