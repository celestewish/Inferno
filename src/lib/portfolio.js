// Pure helpers for Portfolio export mode: a polished, case-study view of a single
// project built from loaded board data. Reuses the recap engine for the "what
// shipped / what's next" content and adds project framing (description, pillars,
// milestones, docs, code links) suitable for a portfolio or case study. Renders
// to copyable Markdown with no external dependency.

import { buildRecap } from './recap.js'

const asArray = (value) => (Array.isArray(value) ? value : [])
const clip = (text, max = 400) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Build the portfolio model for one project. `tasks` should already be the full
// task list; it is filtered to the project here.
export function buildPortfolio({
  project,
  tasks = [],
  docs = [],
  repos = [],
  meetingNotes = [],
  messages = [],
  profiles = {},
  now = new Date(),
} = {}) {
  if (!project) return null

  const projectTasks = asArray(tasks).filter((task) => task && task.projectId === project.id)
  const projectDocs = asArray(docs).filter((doc) => doc && !doc.archivedAt && (doc.projectId === project.id || !doc.projectId))
  const projectRepos = asArray(repos).filter((repo) => repo && !repo.archivedAt && (repo.projectId === project.id || !repo.projectId))

  const recap = buildRecap({
    scope: project.name || 'Project',
    tasks: projectTasks,
    projects: [project],
    docs: projectDocs,
    repos: projectRepos,
    messages,
    meetingNotes,
    profiles,
    now,
  })

  const completed = projectTasks.filter((task) => task.completed).length
  const total = projectTasks.length

  return {
    name: clip(project.name || 'Untitled project', 120),
    tagline: clip(project.tagline || '', 200),
    description: clip(project.description || project.tagline || '', 600),
    category: project.category || '',
    platform: project.targetPlatform || '',
    methodology: project.methodology || '',
    phase: project.phase || '',
    pillars: asArray(project.pillars).map((p) => clip(p, 80)).filter(Boolean),
    stats: {
      tasksCompleted: completed,
      tasksTotal: total,
      completionPct: total ? Math.round((completed / total) * 100) : 0,
      milestones: recap.bossesDefeated.length,
      docs: recap.docsLinked.length,
      codeLinks: recap.codeLinks.length,
    },
    highlights: recap.shipped.slice(0, 12),
    milestones: recap.bossesDefeated,
    docs: recap.docsLinked,
    codeLinks: recap.codeLinks,
    nextFocus: recap.nextFocus,
    generatedAt: recap.generatedAt,
  }
}

// Render a portfolio model to copyable Markdown suitable for a case study.
export function portfolioToMarkdown(portfolio) {
  if (!portfolio) return ''
  const lines = []
  const bullet = (text) => lines.push(`- ${text}`)

  lines.push(`# ${portfolio.name}`)
  if (portfolio.tagline) lines.push(`_${portfolio.tagline}_`)

  const facts = [
    portfolio.category && `Category: ${portfolio.category}`,
    portfolio.platform && `Platform: ${portfolio.platform}`,
    portfolio.methodology && `Method: ${portfolio.methodology}`,
    portfolio.phase && `Phase: ${portfolio.phase}`,
  ].filter(Boolean)
  if (facts.length) {
    lines.push('')
    lines.push(facts.join(' | '))
  }

  if (portfolio.description) {
    lines.push('')
    lines.push('## Overview')
    lines.push(portfolio.description)
  }

  if (portfolio.pillars.length) {
    lines.push('')
    lines.push('## Design pillars')
    for (const pillar of portfolio.pillars) bullet(pillar)
  }

  lines.push('')
  lines.push('## By the numbers')
  bullet(`${portfolio.stats.tasksCompleted} of ${portfolio.stats.tasksTotal} tasks complete (${portfolio.stats.completionPct}%)`)
  bullet(`${portfolio.stats.milestones} milestones cleared`)
  bullet(`${portfolio.stats.docs} docs, ${portfolio.stats.codeLinks} code links`)

  if (portfolio.highlights.length) {
    lines.push('')
    lines.push('## Highlights')
    for (const item of portfolio.highlights) {
      const tags = [item.discipline, item.assignee].filter(Boolean).join(', ')
      bullet(tags ? `${item.title} (${tags})` : item.title)
    }
  }

  if (portfolio.milestones.length) {
    lines.push('')
    lines.push('## Milestones')
    for (const boss of portfolio.milestones) bullet(boss.name)
  }

  if (portfolio.docs.length) {
    lines.push('')
    lines.push('## Documentation')
    for (const doc of portfolio.docs) {
      const label = doc.docType ? `${doc.title} (${doc.docType})` : doc.title
      bullet(doc.url ? `[${label}](${doc.url})` : label)
    }
  }

  if (portfolio.codeLinks.length) {
    lines.push('')
    lines.push('## Code')
    for (const link of portfolio.codeLinks) {
      bullet(link.url ? `[${link.label}](${link.url})` : link.label)
    }
  }

  if (portfolio.nextFocus.length) {
    lines.push('')
    lines.push('## What is next')
    for (const task of portfolio.nextFocus) bullet(task.title)
  }

  return lines.join('\n')
}
