// Pure, deterministic recap generation. Produces a weekly/project summary from
// the board data already loaded in the client. No LLM, no API, no randomness:
// the same inputs always yield the same recap, so it is safe to test and to
// export. buildRecap returns a structured object; recapToMarkdown renders it to
// a copyable Markdown document.

import { parseDueDate, isOverdue } from './dates.js'

const asArray = (value) => (Array.isArray(value) ? value : [])
const clip = (text, max = 140) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Build the recap model. `scope` is a label for the heading (e.g. a project name
// or "All projects"). `now` is injectable for testing overdue detection.
export function buildRecap({
  scope = 'All projects',
  tasks = [],
  projects = [],
  docs = [],
  repos = [],
  messages = [],
  meetingNotes = [],
  profiles = {},
  now = new Date(),
} = {}) {
  const allTasks = asArray(tasks)

  // Shipped: completed tasks.
  const shipped = allTasks
    .filter((task) => task && task.completed)
    .map((task) => ({
      id: task.id,
      title: clip(task.title, 120),
      discipline: task.discipline || '',
      assignee: task.assignee && task.assignee !== 'Unassigned' ? task.assignee : '',
    }))

  // Blockers / open items: overdue incomplete tasks + open meeting action items.
  const overdueTasks = allTasks
    .filter((task) => task && !task.completed && isOverdue(task.due, task.completed))
    .map((task) => ({
      id: task.id,
      title: clip(task.title, 120),
      due: task.due,
    }))
  const openActionItems = []
  for (const note of asArray(meetingNotes)) {
    if (!note || note.archivedAt) continue
    for (const item of asArray(note.actionItems)) {
      if (!item || item.done || !clip(item.text)) continue
      openActionItems.push({ id: `${note.id}:${item.id}`, text: clip(item.text, 120), from: clip(note.title, 60) })
    }
  }

  // Team activity: completed-task counts by assignee, busiest first.
  const byAssignee = new Map()
  for (const task of shipped) {
    const who = task.assignee || 'Unassigned'
    byAssignee.set(who, (byAssignee.get(who) || 0) + 1)
  }
  const teamActivity = [...byAssignee.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  // Boss fights: milestones defeated/claimed in scope.
  const bossesDefeated = []
  for (const project of asArray(projects)) {
    for (const boss of asArray(project?.bossFights)) {
      if (!boss || !boss.claimed) continue
      bossesDefeated.push({ id: boss.id, name: clip(boss.name || 'A boss', 80), project: clip(project.name || '', 60) })
    }
  }

  // Docs updated / linked.
  const docsLinked = asArray(docs)
    .filter((doc) => doc && !doc.archivedAt)
    .map((doc) => ({ id: doc.id, title: clip(doc.title || 'Untitled doc', 100), url: doc.url || '', docType: doc.docType || '' }))

  // Code links: Code Forge repos plus any task-level code refs.
  const codeLinks = []
  for (const repo of asArray(repos)) {
    if (!repo || repo.archivedAt) continue
    codeLinks.push({ id: repo.id, label: clip(repo.displayName || repo.repo || 'Repository', 80), url: repo.repoUrl || '' })
  }
  for (const task of allTasks) {
    for (const ref of asArray(task?.codeRefs)) {
      if (!ref?.url) continue
      codeLinks.push({ id: `${task.id}:${ref.id}`, label: clip(ref.label || 'Code link', 80), url: ref.url })
    }
  }

  // Next suggested focus: highest-priority incomplete tasks, soonest due first.
  const priorityRank = { High: 0, Medium: 1, Low: 2 }
  const nextFocus = allTasks
    .filter((task) => task && !task.completed)
    .slice()
    .sort((a, b) => {
      const pr = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3)
      if (pr !== 0) return pr
      const da = parseDueDate(a.due)
      const db = parseDueDate(b.due)
      if (da && db) return da - db
      if (da) return -1
      if (db) return 1
      return 0
    })
    .slice(0, 5)
    .map((task) => ({ id: task.id, title: clip(task.title, 120), priority: task.priority || '', due: task.due }))

  const pinnedCount = asArray(messages).filter((m) => m && m.pinned).length

  return {
    scope,
    generatedAt: now instanceof Date ? now.toISOString() : String(now),
    counts: {
      shipped: shipped.length,
      openItems: overdueTasks.length + openActionItems.length,
      bosses: bossesDefeated.length,
      docs: docsLinked.length,
      codeLinks: codeLinks.length,
      pinned: pinnedCount,
    },
    shipped,
    overdueTasks,
    openActionItems,
    teamActivity,
    bossesDefeated,
    docsLinked,
    codeLinks,
    nextFocus,
  }
}

// Render a recap model to copyable Markdown. Deterministic given the model.
export function recapToMarkdown(recap) {
  if (!recap) return ''
  const lines = []
  const bullet = (text) => lines.push(`- ${text}`)
  const section = (title) => {
    lines.push('')
    lines.push(`## ${title}`)
  }

  lines.push(`# Recap: ${recap.scope}`)
  const date = String(recap.generatedAt || '').slice(0, 10)
  if (date) lines.push(`_Generated ${date}_`)

  section('Shipped')
  if (recap.shipped.length) {
    for (const item of recap.shipped) {
      const tags = [item.discipline, item.assignee].filter(Boolean).join(', ')
      bullet(tags ? `${item.title} (${tags})` : item.title)
    }
  } else {
    bullet('Nothing marked complete in this scope yet.')
  }

  if (recap.bossesDefeated.length) {
    section('Milestones')
    for (const boss of recap.bossesDefeated) {
      bullet(boss.project ? `${boss.name} in ${boss.project}` : boss.name)
    }
  }

  section('Blockers and open items')
  if (recap.overdueTasks.length || recap.openActionItems.length) {
    for (const task of recap.overdueTasks) bullet(`Overdue: ${task.title}`)
    for (const item of recap.openActionItems) bullet(`Action item: ${item.text} (from ${item.from})`)
  } else {
    bullet('No overdue tasks or open action items.')
  }

  section('Team activity')
  if (recap.teamActivity.length) {
    for (const member of recap.teamActivity) {
      bullet(`${member.name}: ${member.count} shipped`)
    }
  } else {
    bullet('No completed tasks to attribute yet.')
  }

  section('Docs updated and linked')
  if (recap.docsLinked.length) {
    for (const doc of recap.docsLinked) {
      const label = doc.docType ? `${doc.title} (${doc.docType})` : doc.title
      bullet(doc.url ? `[${label}](${doc.url})` : label)
    }
  } else {
    bullet('No docs linked yet.')
  }

  section('Code links')
  if (recap.codeLinks.length) {
    for (const link of recap.codeLinks) {
      bullet(link.url ? `[${link.label}](${link.url})` : link.label)
    }
  } else {
    bullet('No code links yet.')
  }

  section('Next suggested focus')
  if (recap.nextFocus.length) {
    for (const task of recap.nextFocus) {
      const meta = [task.priority, task.due && task.due !== 'TBD' ? `due ${task.due}` : ''].filter(Boolean).join(', ')
      bullet(meta ? `${task.title} (${meta})` : task.title)
    }
  } else {
    bullet('Backlog is clear. Plan the next milestone.')
  }

  return lines.join('\n')
}
