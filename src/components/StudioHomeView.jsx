import { useMemo } from 'react'
import { buildStudioHome } from '../lib/studio'
import { firstLine } from '../lib/campfire'
import { formatDueLabel } from '../lib/dates'
import {
  FlameIcon,
  TrophyIcon,
  BookIcon,
  ForgeIcon,
  HeadsetIcon,
  CalendarIcon,
  TasksIcon,
  ExternalLinkIcon,
} from './Icons'

// The post-login command center. It stitches together every board-scoped system
// (quests, boss fights, Campfire, deadlines, docs, repos, War Room) into one
// glanceable view. All heavy lifting is in lib/studio.js; this file only renders.
export default function StudioHomeView({
  projects = [],
  tasks = [],
  messages = [],
  docs = [],
  repos = [],
  meetingNotes = [],
  focusTasks = [],
  focusProgress = { total: 0, completed: 0 },
  completedById = {},
  profiles = {},
  displayName = '',
  onSelectSection,
  onOpenTask,
}) {
  const home = useMemo(
    () =>
      buildStudioHome({
        projects,
        tasks,
        messages,
        docs,
        repos,
        meetingNotes,
        focusTasks,
        focusProgress,
        completedById,
      }),
    [projects, tasks, messages, docs, repos, meetingNotes, focusTasks, focusProgress, completedById],
  )

  const projectName = (id) => projects.find((p) => p.id === id)?.name || 'Project'
  const authorName = (userId) => profiles[userId] || 'Teammate'
  const greeting = displayName ? `Welcome back, ${displayName}` : 'Welcome back'

  const go = (section) => () => onSelectSection?.(section)

  return (
    <section className="studio-home" data-testid="studio-home" aria-label="Studio Home">
      <header className="view-header">
        <div>
          <p className="eyebrow">Command center</p>
          <h1>{greeting}</h1>
          <p className="muted-copy">Everything in motion across your studio, in one place.</p>
        </div>
      </header>

      <div className="studio-metrics" role="list">
        <div className="studio-metric" role="listitem">
          <span className="studio-metric-value">{home.counts.openTasks}</span>
          <span className="studio-metric-label">Open quests</span>
        </div>
        <div className="studio-metric" role="listitem">
          <span className="studio-metric-value">{home.counts.projects}</span>
          <span className="studio-metric-label">Projects</span>
        </div>
        <div className="studio-metric" role="listitem">
          <span className="studio-metric-value">{home.counts.docs}</span>
          <span className="studio-metric-label">Docs</span>
        </div>
        <div className="studio-metric" role="listitem">
          <span className="studio-metric-value">{home.counts.repos}</span>
          <span className="studio-metric-label">Repos</span>
        </div>
      </div>

      <div className="studio-grid">
        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><FlameIcon size={17} /> Today&apos;s Quests</h2>
            <button type="button" className="ghost-btn" onClick={go('board')}>Open board</button>
          </div>
          {home.quests.tasks.length ? (
            <>
              <p className="studio-card-meta">
                {home.quests.completed} of {home.quests.total} complete
              </p>
              <ul className="studio-list">
                {home.quests.tasks.map((task) => (
                  <li key={task.id}>
                    <button type="button" className="studio-link-row" onClick={() => onOpenTask?.(task.id)}>
                      <span className={task.completed ? 'studio-check is-done' : 'studio-check'} aria-hidden="true" />
                      <span className="studio-row-title">{task.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="studio-empty">No quests picked yet. Set your daily focus on the board to rally the party.</p>
          )}
        </article>

        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><TrophyIcon size={17} /> Active Boss Fight</h2>
          </div>
          {home.bosses.length ? (
            <ul className="studio-list">
              {home.bosses.map((boss) => (
                <li key={boss.id} className="studio-boss">
                  <div className="studio-boss-head">
                    <strong>{boss.name}</strong>
                    <span className="studio-boss-project">{boss.projectName}</span>
                  </div>
                  <div className="studio-hpbar" role="progressbar" aria-valuenow={boss.progress.pct} aria-valuemin={0} aria-valuemax={100}>
                    <span className="studio-hpbar-fill" style={{ width: `${boss.progress.pct}%` }} />
                  </div>
                  <p className="studio-card-meta">
                    {boss.progress.remaining} of {boss.progress.total} weak points remaining
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="studio-empty">No boss fights raging. Rally a milestone from a project to start one.</p>
          )}
        </article>

        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><CalendarIcon size={17} /> Upcoming Deadlines</h2>
            <button type="button" className="ghost-btn" onClick={go('calendar')}>Calendar</button>
          </div>
          {home.deadlines.length ? (
            <ul className="studio-list">
              {home.deadlines.map((item) => (
                <li key={item.id}>
                  <button type="button" className="studio-link-row" onClick={() => onOpenTask?.(item.id)}>
                    <span className="studio-row-title">{item.title}</span>
                    <span className={item.overdue ? 'studio-due is-overdue' : 'studio-due'}>
                      {item.overdue ? 'Overdue' : formatDueLabel(item.due)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="studio-empty">Nothing due. Add due dates to tasks to see the road ahead.</p>
          )}
        </article>

        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><FlameIcon size={17} /> Latest from Campfire</h2>
            <button type="button" className="ghost-btn" onClick={go('campfire')}>Open Campfire</button>
          </div>
          {home.messages.length ? (
            <ul className="studio-list">
              {home.messages.map((message) => (
                <li key={message.id} className="studio-message">
                  <span className="studio-message-author">{authorName(message.userId)}</span>
                  <span className="studio-row-title">{firstLine(message.text) || '(no text)'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="studio-empty">Campfire is quiet. Say hello to get the party talking.</p>
          )}
        </article>

        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><BookIcon size={17} /> Recent Docs</h2>
            <button type="button" className="ghost-btn" onClick={go('docs')}>Docs Hub</button>
          </div>
          {home.docs.length ? (
            <ul className="studio-list">
              {home.docs.map((doc) => (
                <li key={doc.id}>
                  <a className="studio-link-row" href={doc.url} target="_blank" rel="noopener noreferrer">
                    <span className="studio-row-title">{doc.title}</span>
                    <ExternalLinkIcon size={14} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="studio-empty">No docs linked yet. Add a GDD or design note in Docs Hub.</p>
          )}
        </article>

        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><ForgeIcon size={17} /> Code Forge</h2>
            <button type="button" className="ghost-btn" onClick={go('codeforge')}>Open Forge</button>
          </div>
          {home.repos.length ? (
            <ul className="studio-list">
              {home.repos.map((repo) => (
                <li key={repo.id}>
                  <a className="studio-link-row" href={repo.repoUrl} target="_blank" rel="noopener noreferrer">
                    <span className="studio-row-title">{repo.displayName}</span>
                    <ExternalLinkIcon size={14} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="studio-empty">No repos registered. Link a GitHub repo in Code Forge.</p>
          )}
        </article>

        <article className="panel studio-card">
          <div className="studio-card-head">
            <h2><HeadsetIcon size={17} /> War Room</h2>
            <button type="button" className="ghost-btn" onClick={go('warroom')}>Open War Room</button>
          </div>
          {home.actionItems.length ? (
            <ul className="studio-list">
              {home.actionItems.map((item) => (
                <li key={item.id} className="studio-message">
                  <span className="studio-message-author">{item.meetingTitle}</span>
                  <span className="studio-row-title"><TasksIcon size={13} /> {item.text}</span>
                </li>
              ))}
            </ul>
          ) : home.notes.length ? (
            <ul className="studio-list">
              {home.notes.map((note) => (
                <li key={note.id} className="studio-row-title">{note.title}</li>
              ))}
            </ul>
          ) : (
            <p className="studio-empty">No meeting notes yet. Huddle up in the War Room and capture the plan.</p>
          )}
        </article>
      </div>
    </section>
  )
}
