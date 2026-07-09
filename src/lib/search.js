// Pure helpers for the global search + command palette. Search runs entirely on
// the client over the board data already loaded in App state, so there is no new
// dependency and no server round-trip. Every result carries a `section` the
// palette navigates to and, where relevant, a `taskId` to open a task modal.

const asArray = (value) => (Array.isArray(value) ? value : [])
const norm = (text) => String(text ?? '').toLowerCase()
const clip = (text, max = 120) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Result kinds, kept as constants so the palette and tests agree.
export const RESULT_TYPES = {
  TASK: 'task',
  PROJECT: 'project',
  DOC: 'doc',
  REPO: 'repo',
  MESSAGE: 'message',
  MEMBER: 'member',
  NOTE: 'note',
  ACTION: 'action_item',
}

// Build the flat, searchable index from board-scoped collections. Each entry has
// a stable key, a type, a title, an optional subtitle, the lower-cased haystack
// used for matching, the target section, and (for tasks) a taskId.
export function buildSearchIndex({
  tasks = [],
  projects = [],
  docs = [],
  repos = [],
  messages = [],
  boardMembers = [],
  profiles = {},
  meetingNotes = [],
} = {}) {
  const projectName = new Map(asArray(projects).map((p) => [p.id, p.name || 'Untitled project']))
  const entries = []

  for (const task of asArray(tasks)) {
    if (!task?.id) continue
    entries.push({
      key: `task:${task.id}`,
      type: RESULT_TYPES.TASK,
      title: task.title || 'Untitled task',
      subtitle: projectName.get(task.projectId) || '',
      section: 'tasks',
      taskId: task.id,
      haystack: norm(`${task.title} ${task.description} ${task.discipline} ${task.assignee} ${(task.labels || []).join(' ')}`),
    })
  }

  for (const project of asArray(projects)) {
    if (!project?.id) continue
    entries.push({
      key: `project:${project.id}`,
      type: RESULT_TYPES.PROJECT,
      title: project.name || 'Untitled project',
      subtitle: project.tagline || project.category || '',
      section: 'projects',
      haystack: norm(`${project.name} ${project.tagline} ${project.category} ${project.targetPlatform}`),
    })
  }

  for (const doc of asArray(docs)) {
    if (!doc?.id || doc.archivedAt) continue
    entries.push({
      key: `doc:${doc.id}`,
      type: RESULT_TYPES.DOC,
      title: doc.title || 'Untitled doc',
      subtitle: doc.docType || doc.url || '',
      section: 'docs',
      url: doc.url || '',
      haystack: norm(`${doc.title} ${doc.description} ${doc.docType} ${doc.url}`),
    })
  }

  for (const repo of asArray(repos)) {
    if (!repo?.id || repo.archivedAt) continue
    entries.push({
      key: `repo:${repo.id}`,
      type: RESULT_TYPES.REPO,
      title: repo.displayName || repo.repo || 'Repository',
      subtitle: repo.repoUrl || '',
      section: 'codeforge',
      url: repo.repoUrl || '',
      haystack: norm(`${repo.displayName} ${repo.owner} ${repo.repo} ${repo.description} ${repo.repoUrl}`),
    })
  }

  for (const message of asArray(messages)) {
    if (!message?.id || !clip(message.text)) continue
    const author = profiles[message.userId] || 'A teammate'
    entries.push({
      key: `message:${message.id}`,
      type: RESULT_TYPES.MESSAGE,
      title: clip(message.text, 80),
      subtitle: `Campfire, ${author}`,
      section: 'campfire',
      haystack: norm(`${message.text} ${author}`),
    })
  }

  const seenMembers = new Set()
  for (const member of asArray(boardMembers)) {
    const id = member?.user_id
    if (!id || seenMembers.has(id)) continue
    seenMembers.add(id)
    const name = profiles[id] || 'Teammate'
    entries.push({
      key: `member:${id}`,
      type: RESULT_TYPES.MEMBER,
      title: name,
      subtitle: member.role || 'member',
      section: 'team',
      haystack: norm(`${name} ${member.role}`),
    })
  }

  for (const note of asArray(meetingNotes)) {
    if (!note?.id || note.archivedAt) continue
    entries.push({
      key: `note:${note.id}`,
      type: RESULT_TYPES.NOTE,
      title: note.title || 'Meeting note',
      subtitle: 'War Room',
      section: 'warroom',
      haystack: norm(`${note.title} ${note.agenda} ${note.notes}`),
    })
    for (const item of asArray(note.actionItems)) {
      if (!item?.id || !clip(item.text)) continue
      entries.push({
        key: `action:${note.id}:${item.id}`,
        type: RESULT_TYPES.ACTION,
        title: clip(item.text, 80),
        subtitle: `Action item, ${note.title || 'meeting'}`,
        section: 'warroom',
        haystack: norm(`${item.text} ${note.title}`),
      })
    }
  }

  return entries
}

// Search the index for a query. Empty query returns []. Matching is a simple
// case-insensitive substring over each entry's haystack; results are ranked so
// title-prefix matches come first, then title-substring, then body matches.
export function searchIndex(index, query, limit = 20) {
  const q = norm(query).trim()
  if (!q) return []
  const scored = []
  for (const entry of asArray(index)) {
    const title = norm(entry.title)
    let score = -1
    if (title.startsWith(q)) score = 0
    else if (title.includes(q)) score = 1
    else if (entry.haystack.includes(q)) score = 2
    if (score >= 0) scored.push({ entry, score })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((s) => s.entry)
}

// Static quick actions available from the command palette. Each maps to an
// action id the palette caller dispatches. Filtered by the same query so typing
// "boss" surfaces "Create boss fight".
export function quickActions() {
  return [
    { key: 'action:create-task', id: 'create-task', title: 'Create task', hint: 'Add a new task' },
    { key: 'action:link-doc', id: 'link-doc', title: 'Link doc', hint: 'Add a doc to Docs Hub' },
    { key: 'action:link-repo', id: 'link-repo', title: 'Link repo', hint: 'Add a repo to Code Forge' },
    { key: 'action:open-campfire', id: 'open-campfire', title: 'Open Campfire', hint: 'Go to team chat' },
    { key: 'action:open-warroom', id: 'open-warroom', title: 'Open War Room', hint: 'Go to voice huddles' },
    { key: 'action:create-boss', id: 'create-boss', title: 'Create boss fight', hint: 'Generate a milestone boss' },
  ]
}

export function filterQuickActions(query, limit = 6) {
  const q = norm(query).trim()
  const all = quickActions()
  if (!q) return all.slice(0, limit)
  return all
    .filter((a) => norm(`${a.title} ${a.hint}`).includes(q))
    .slice(0, limit)
}
