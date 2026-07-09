import { useMemo, useState } from 'react'
import { buildRecap, recapToMarkdown } from '../lib/recap'
import { RecapIcon, CopyIcon, CheckIcon, TrophyIcon, TasksIcon, BookIcon, ForgeIcon, FlameIcon } from './Icons'

// Smart Recaps. Generates a deterministic project/weekly summary from loaded
// board data (no LLM, no API) and offers a copyable Markdown export.
export default function RecapView({
  projects = [],
  tasks = [],
  docs = [],
  repos = [],
  messages = [],
  meetingNotes = [],
  profiles = {},
}) {
  const [scopeId, setScopeId] = useState('all')
  const [copied, setCopied] = useState(false)

  const recap = useMemo(() => {
    const scoped = scopeId === 'all' ? tasks : tasks.filter((task) => task.projectId === scopeId)
    const scopedProjects = scopeId === 'all' ? projects : projects.filter((p) => p.id === scopeId)
    const scopedDocs = scopeId === 'all' ? docs : docs.filter((d) => d.projectId === scopeId || !d.projectId)
    const scopedRepos = scopeId === 'all' ? repos : repos.filter((r) => r.projectId === scopeId || !r.projectId)
    const scopeName = scopeId === 'all' ? 'All projects' : projects.find((p) => p.id === scopeId)?.name || 'Project'
    return buildRecap({
      scope: scopeName,
      tasks: scoped,
      projects: scopedProjects,
      docs: scopedDocs,
      repos: scopedRepos,
      messages,
      meetingNotes,
      profiles,
    })
  }, [scopeId, projects, tasks, docs, repos, messages, meetingNotes, profiles])

  const markdown = useMemo(() => recapToMarkdown(recap), [recap])

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="recap-view" data-testid="recap-view" aria-label="Smart recaps">
      <header className="view-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Smart Recaps</h1>
          <p className="muted-copy">A deterministic summary of what shipped, what is open, and what to do next.</p>
        </div>
        <div className="recap-controls">
          <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} data-testid="recap-scope" aria-label="Recap scope">
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button type="button" className="secondary-btn" onClick={copyMarkdown} data-testid="recap-copy">
            {copied ? <><CheckIcon size={14} /> Copied</> : <><CopyIcon size={14} /> Copy Markdown</>}
          </button>
        </div>
      </header>

      <div className="recap-metrics">
        <div className="recap-metric"><TasksIcon size={16} /><strong>{recap.counts.shipped}</strong><span>Shipped</span></div>
        <div className="recap-metric"><FlameIcon size={16} /><strong>{recap.counts.openItems}</strong><span>Open items</span></div>
        <div className="recap-metric"><TrophyIcon size={16} /><strong>{recap.counts.bosses}</strong><span>Milestones</span></div>
        <div className="recap-metric"><BookIcon size={16} /><strong>{recap.counts.docs}</strong><span>Docs</span></div>
        <div className="recap-metric"><ForgeIcon size={16} /><strong>{recap.counts.codeLinks}</strong><span>Code links</span></div>
      </div>

      <div className="recap-grid">
        <RecapCard title="Shipped" icon={<TasksIcon size={16} />} empty={recap.shipped.length === 0} emptyText="Nothing marked complete yet.">
          {recap.shipped.map((item) => (
            <li key={item.id}>
              <span className="recap-row-title">{item.title}</span>
              {(item.discipline || item.assignee) ? (
                <span className="recap-row-meta">{[item.discipline, item.assignee].filter(Boolean).join(' · ')}</span>
              ) : null}
            </li>
          ))}
        </RecapCard>

        <RecapCard title="Blockers and open items" icon={<FlameIcon size={16} />} empty={recap.overdueTasks.length === 0 && recap.openActionItems.length === 0} emptyText="No overdue tasks or open action items.">
          {recap.overdueTasks.map((task) => (
            <li key={task.id}><span className="recap-row-title">{task.title}</span><span className="recap-row-meta is-overdue">Overdue</span></li>
          ))}
          {recap.openActionItems.map((item) => (
            <li key={item.id}><span className="recap-row-title">{item.text}</span><span className="recap-row-meta">{item.from}</span></li>
          ))}
        </RecapCard>

        <RecapCard title="Team activity" icon={<TrophyIcon size={16} />} empty={recap.teamActivity.length === 0} emptyText="No completed tasks to attribute yet.">
          {recap.teamActivity.map((member) => (
            <li key={member.name}><span className="recap-row-title">{member.name}</span><span className="recap-row-meta">{member.count} shipped</span></li>
          ))}
        </RecapCard>

        <RecapCard title="Docs updated and linked" icon={<BookIcon size={16} />} empty={recap.docsLinked.length === 0} emptyText="No docs linked yet.">
          {recap.docsLinked.map((doc) => (
            <li key={doc.id}>
              {doc.url
                ? <a className="recap-row-title" href={doc.url} target="_blank" rel="noopener noreferrer">{doc.title}</a>
                : <span className="recap-row-title">{doc.title}</span>}
              {doc.docType ? <span className="recap-row-meta">{doc.docType}</span> : null}
            </li>
          ))}
        </RecapCard>

        <RecapCard title="Code links" icon={<ForgeIcon size={16} />} empty={recap.codeLinks.length === 0} emptyText="No code links yet.">
          {recap.codeLinks.map((link) => (
            <li key={link.id}>
              {link.url
                ? <a className="recap-row-title" href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
                : <span className="recap-row-title">{link.label}</span>}
            </li>
          ))}
        </RecapCard>

        <RecapCard title="Next suggested focus" icon={<RecapIcon size={16} />} empty={recap.nextFocus.length === 0} emptyText="Backlog is clear. Plan the next milestone.">
          {recap.nextFocus.map((task) => (
            <li key={task.id}>
              <span className="recap-row-title">{task.title}</span>
              <span className="recap-row-meta">{[task.priority, task.due && task.due !== 'TBD' ? task.due : ''].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </RecapCard>
      </div>
    </section>
  )
}

function RecapCard({ title, icon, children, empty, emptyText }) {
  return (
    <article className="recap-card" data-testid="recap-card">
      <div className="recap-card-head">
        <span className="recap-card-icon" aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </div>
      {empty ? (
        <p className="recap-empty muted-copy">{emptyText}</p>
      ) : (
        <ul className="recap-list">{children}</ul>
      )}
    </article>
  )
}
