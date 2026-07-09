// Pure aggregation helpers for the Studio Home dashboard. No React, no Supabase:
// these take already-loaded, board-scoped collections and shape them into the
// small view models the dashboard renders. Everything is deterministic so the
// dashboard can be unit-tested with plain Node.
import { getBossProgress } from './gamification.js'
import { parseDueDate, isOverdue } from './dates.js'

const asArray = (value) => (Array.isArray(value) ? value : [])

// Sort a list newest-first by a date-ish field (ISO string or Date), returning a
// shallow copy so callers never mutate their source array.
export function recentByDate(list, dateField = 'createdAt', limit = 5) {
  return asArray(list)
    .filter(Boolean)
    .slice()
    .sort((a, b) => String(b?.[dateField] || '').localeCompare(String(a?.[dateField] || '')))
    .slice(0, Math.max(0, limit))
}

// Incomplete tasks that have a parseable due date, soonest first, each tagged
// with overdue state and a normalized dueDate for rendering.
export function upcomingDeadlines(tasks, { limit = 6, now = new Date() } = {}) {
  return asArray(tasks)
    .filter((task) => task && !task.completed)
    .map((task) => ({ task, dueDate: parseDueDate(task.due) }))
    .filter((entry) => entry.dueDate instanceof Date && !Number.isNaN(entry.dueDate.getTime()))
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, Math.max(0, limit))
    .map((entry) => ({
      id: entry.task.id,
      title: entry.task.title,
      projectId: entry.task.projectId,
      due: entry.task.due,
      dueDate: entry.dueDate,
      overdue: isOverdue(entry.task.due, entry.task.completed),
      daysAway: Math.round((entry.dueDate - now) / 86400000),
    }))
}

// Every non-defeated boss across all projects, annotated with live HP progress
// and its project name, ordered by how close it is to defeat (fewest remaining
// tasks first) so the most actionable fight surfaces at the top.
export function activeBossFights(projects, completedById = {}, limit = 4) {
  const rows = []
  for (const project of asArray(projects)) {
    for (const boss of asArray(project?.bossFights)) {
      if (!boss || boss.claimed) continue
      const progress = getBossProgress(boss, completedById)
      if (progress.defeated) continue
      rows.push({
        id: boss.id,
        name: boss.name || 'Unnamed boss',
        phase: boss.phase || '',
        projectId: project.id,
        projectName: project.name || 'Project',
        progress,
      })
    }
  }
  return rows
    .sort((a, b) => a.progress.remaining - b.progress.remaining || b.progress.completed - a.progress.completed)
    .slice(0, Math.max(0, limit))
}

// Flatten open action items out of meeting notes so the dashboard can nudge the
// team toward the next concrete step. Newest notes first; done items excluded.
export function openActionItems(notes, limit = 6) {
  const rows = []
  for (const note of recentByDate(notes, 'createdAt', asArray(notes).length)) {
    if (note?.archivedAt) continue
    for (const item of asArray(note.actionItems)) {
      if (!item || item.done || !String(item.text || '').trim()) continue
      rows.push({ id: `${note.id}:${item.id}`, text: item.text, meetingTitle: note.title, noteId: note.id })
    }
  }
  return rows.slice(0, Math.max(0, limit))
}

// The one-call view model for Studio Home. All inputs are board-scoped; the
// dashboard renders each slice with its own useful empty state.
export function buildStudioHome({
  projects = [],
  tasks = [],
  messages = [],
  docs = [],
  repos = [],
  meetingNotes = [],
  focusTasks = [],
  focusProgress = { total: 0, completed: 0 },
  completedById = {},
  now = new Date(),
} = {}) {
  const liveDocs = asArray(docs).filter((doc) => doc && !doc.archivedAt)
  const liveRepos = asArray(repos).filter((repo) => repo && !repo.archivedAt)
  const liveNotes = asArray(meetingNotes).filter((note) => note && !note.archivedAt)
  const openTasks = asArray(tasks).filter((task) => task && !task.completed)

  return {
    quests: {
      tasks: asArray(focusTasks),
      total: focusProgress.total || 0,
      completed: focusProgress.completed || 0,
    },
    bosses: activeBossFights(projects, completedById),
    messages: recentByDate(messages, 'createdAt', 5),
    deadlines: upcomingDeadlines(tasks, { limit: 6, now }),
    docs: recentByDate(liveDocs, 'updatedAt', 4).length
      ? recentByDate(liveDocs, 'updatedAt', 4)
      : recentByDate(liveDocs, 'createdAt', 4),
    repos: recentByDate(liveRepos, 'createdAt', 4),
    notes: recentByDate(liveNotes, 'createdAt', 4),
    actionItems: openActionItems(liveNotes),
    counts: {
      projects: asArray(projects).length,
      openTasks: openTasks.length,
      docs: liveDocs.length,
      repos: liveRepos.length,
      notes: liveNotes.length,
    },
  }
}
