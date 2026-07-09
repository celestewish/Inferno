// Sanity checks for the Portfolio export helpers. Run with
// `node scripts/portfolio-sanity.mjs`. Exits non-zero on failure.
import { buildPortfolio, portfolioToMarkdown } from '../src/lib/portfolio.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

const project = {
  id: 'p1',
  name: 'Ember Quest',
  tagline: 'A cozy RPG about rekindling a dying world',
  description: 'A narrative RPG where players restore warmth to a frozen kingdom.',
  category: 'RPG',
  targetPlatform: 'PC',
  methodology: 'Vertical Slice',
  phase: 'Production',
  pillars: ['Cozy exploration', 'Meaningful choices', ''],
  bossFights: [{ id: 'b1', name: 'Vertical slice', claimed: true }],
}

const tasks = [
  { id: 't1', projectId: 'p1', title: 'Combat prototype', discipline: 'Programming', assignee: 'Riley', completed: true, priority: 'High', due: 'TBD' },
  { id: 't2', projectId: 'p1', title: 'Dialogue system', assignee: 'Sam', completed: false, priority: 'High', due: '2099-01-01' },
  { id: 't3', projectId: 'other', title: 'Not this project', completed: true },
]

const docs = [{ id: 'd1', projectId: 'p1', title: 'GDD', docType: 'GDD', url: 'https://docs.dev/gdd' }]
const repos = [{ id: 'r1', projectId: 'p1', displayName: 'ember', repoUrl: 'https://github.com/studio/ember' }]

const portfolio = buildPortfolio({ project, tasks, docs, repos })

assert(portfolio.name === 'Ember Quest', 'portfolio carries the project name')
assert(portfolio.pillars.length === 2, 'portfolio drops blank pillars')
assert(portfolio.stats.tasksTotal === 2, 'portfolio scopes tasks to the project')
assert(portfolio.stats.tasksCompleted === 1, 'portfolio counts completed project tasks')
assert(portfolio.stats.completionPct === 50, 'portfolio computes completion percent')
assert(portfolio.stats.milestones === 1, 'portfolio counts claimed milestones')
assert(portfolio.highlights.length === 1 && portfolio.highlights[0].title === 'Combat prototype', 'portfolio highlights shipped work')
assert(portfolio.codeLinks.length === 1, 'portfolio includes code links')
assert(portfolio.nextFocus.length === 1 && portfolio.nextFocus[0].title === 'Dialogue system', 'portfolio suggests next focus')

const md = portfolioToMarkdown(portfolio)
assert(md.startsWith('# Ember Quest'), 'markdown leads with the project title')
assert(md.includes('## Overview'), 'markdown includes an overview')
assert(md.includes('## By the numbers'), 'markdown includes a stats section')
assert(md.includes('[GDD (GDD)](https://docs.dev/gdd)'), 'markdown links docs')
assert(md.includes('50%'), 'markdown reports completion percent')

assert(buildPortfolio({ project: null }) === null, 'buildPortfolio returns null without a project')
assert(portfolioToMarkdown(null) === '', 'portfolioToMarkdown tolerates null')

// determinism
assert(portfolioToMarkdown(buildPortfolio({ project, tasks, docs, repos })) === md, 'portfolio is deterministic')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll Portfolio helper checks passed.')
