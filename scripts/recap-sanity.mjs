// Sanity checks for the Smart Recaps helpers. Run with
// `node scripts/recap-sanity.mjs`. Exits non-zero on failure.
import { buildRecap, recapToMarkdown } from '../src/lib/recap.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

const now = new Date()

const tasks = [
  { id: 't1', title: 'Ship combat', discipline: 'Programming', assignee: 'Riley', completed: true, priority: 'High', due: 'TBD' },
  { id: 't2', title: 'Polish UI', discipline: 'UI / UX', assignee: 'Riley', completed: true, priority: 'Medium', due: 'TBD' },
  { id: 't3', title: 'Fix crash', assignee: 'Sam', completed: false, priority: 'High', due: '2000-01-01' },
  { id: 't4', title: 'Plan level 2', assignee: 'Unassigned', completed: false, priority: 'Low', due: '2099-01-01', codeRefs: [{ id: 'c1', label: 'PR 5', url: 'https://github.com/x/y/pull/5' }] },
]

const projects = [
  { id: 'p1', name: 'Ember', bossFights: [{ id: 'b1', name: 'Prototype', claimed: true }, { id: 'b2', name: 'WIP', claimed: false }] },
]

const docs = [
  { id: 'd1', title: 'GDD', docType: 'GDD', url: 'https://docs.dev/gdd' },
  { id: 'd2', title: 'Archived', archivedAt: '2026-01-01' },
]

const repos = [{ id: 'r1', displayName: 'ember-client', repoUrl: 'https://github.com/studio/ember' }]

const messages = [{ id: 'm1', pinned: true }, { id: 'm2', pinned: false }]

const meetingNotes = [
  { id: 'n1', title: 'Sprint', actionItems: [{ id: 'a1', text: 'Write tests', done: false }, { id: 'a2', text: 'Done thing', done: true }] },
]

const recap = buildRecap({ scope: 'Ember', tasks, projects, docs, repos, messages, meetingNotes, now })

assert(recap.counts.shipped === 2, 'counts shipped (completed) tasks')
assert(recap.shipped.every((s) => s.title), 'shipped items carry titles')
assert(recap.counts.bosses === 1, 'counts only claimed bosses')
assert(recap.overdueTasks.length === 1 && recap.overdueTasks[0].id === 't3', 'flags overdue incomplete task')
assert(recap.openActionItems.length === 1 && recap.openActionItems[0].text === 'Write tests', 'collects open action items')
assert(recap.teamActivity[0].name === 'Riley' && recap.teamActivity[0].count === 2, 'attributes shipped to busiest member first')
assert(recap.docsLinked.length === 1, 'excludes archived docs')
assert(recap.counts.codeLinks === 2, 'counts repo and task code links')
assert(recap.counts.pinned === 1, 'counts pinned messages')
assert(recap.nextFocus[0].id === 't3', 'next focus ranks high priority first')

const md = recapToMarkdown(recap)
assert(md.startsWith('# Recap: Ember'), 'markdown has a titled heading')
assert(md.includes('## Shipped'), 'markdown includes a Shipped section')
assert(md.includes('## Next suggested focus'), 'markdown includes a Next focus section')
assert(md.includes('[GDD (GDD)](https://docs.dev/gdd)'), 'markdown links docs')
assert(recapToMarkdown(buildRecap()).includes('Nothing marked complete'), 'empty recap renders friendly copy')

// determinism
assert(recapToMarkdown(buildRecap({ scope: 'Ember', tasks, projects, docs, repos, messages, meetingNotes, now })) === md, 'recap is deterministic')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll Recap helper checks passed.')
