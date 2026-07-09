import { useMemo, useState, useEffect } from 'react'
import { buildPortfolio, portfolioToMarkdown } from '../lib/portfolio'
import { PortfolioIcon, CopyIcon, CheckIcon, ExternalLinkIcon, TrophyIcon } from './Icons'

// Portfolio export mode. A polished, case-study view of a single project with a
// copyable Markdown export and a print-friendly layout (window.print, no PDF
// dependency).
export default function PortfolioView({
  projects = [],
  tasks = [],
  docs = [],
  repos = [],
  meetingNotes = [],
  messages = [],
  profiles = {},
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!projects.some((p) => p.id === projectId)) {
      setProjectId(projects[0]?.id || '')
    }
  }, [projects, projectId])

  const project = projects.find((p) => p.id === projectId) || null
  const portfolio = useMemo(
    () => buildPortfolio({ project, tasks, docs, repos, meetingNotes, messages, profiles }),
    [project, tasks, docs, repos, meetingNotes, messages, profiles]
  )
  const markdown = useMemo(() => portfolioToMarkdown(portfolio), [portfolio])

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
    <section className="portfolio-view" data-testid="portfolio-view" aria-label="Portfolio export">
      <header className="view-header portfolio-controls-header">
        <div>
          <p className="eyebrow">Case study</p>
          <h1>Portfolio Export</h1>
          <p className="muted-copy">A polished, shareable case study built from this project&apos;s work.</p>
        </div>
        <div className="portfolio-controls">
          {projects.length > 1 ? (
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} data-testid="portfolio-project" aria-label="Project">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : null}
          <button type="button" className="secondary-btn" onClick={copyMarkdown} data-testid="portfolio-copy" disabled={!portfolio}>
            {copied ? <><CheckIcon size={14} /> Copied</> : <><CopyIcon size={14} /> Copy Markdown</>}
          </button>
          <button type="button" className="secondary-btn" onClick={() => window.print()} disabled={!portfolio}>
            Print
          </button>
        </div>
      </header>

      {!portfolio ? (
        <div className="portfolio-empty">
          <PortfolioIcon size={26} />
          <p>Create a project to generate a portfolio case study.</p>
        </div>
      ) : (
        <article className="portfolio-doc" data-testid="portfolio-doc">
          <div className="portfolio-hero">
            <h2>{portfolio.name}</h2>
            {portfolio.tagline ? <p className="portfolio-tagline">{portfolio.tagline}</p> : null}
            <div className="portfolio-facts">
              {portfolio.category ? <span>{portfolio.category}</span> : null}
              {portfolio.platform ? <span>{portfolio.platform}</span> : null}
              {portfolio.methodology ? <span>{portfolio.methodology}</span> : null}
              {portfolio.phase ? <span>{portfolio.phase}</span> : null}
            </div>
          </div>

          <div className="portfolio-stats">
            <div><strong>{portfolio.stats.completionPct}%</strong><span>Complete</span></div>
            <div><strong>{portfolio.stats.tasksCompleted}</strong><span>Tasks shipped</span></div>
            <div><strong>{portfolio.stats.milestones}</strong><span>Milestones</span></div>
            <div><strong>{portfolio.stats.docs}</strong><span>Docs</span></div>
            <div><strong>{portfolio.stats.codeLinks}</strong><span>Code links</span></div>
          </div>

          {portfolio.description ? (
            <section className="portfolio-section">
              <h3>Overview</h3>
              <p>{portfolio.description}</p>
            </section>
          ) : null}

          {portfolio.pillars.length ? (
            <section className="portfolio-section">
              <h3>Design pillars</h3>
              <ul className="portfolio-pillars">
                {portfolio.pillars.map((pillar) => <li key={pillar}>{pillar}</li>)}
              </ul>
            </section>
          ) : null}

          {portfolio.highlights.length ? (
            <section className="portfolio-section">
              <h3>Highlights</h3>
              <ul className="portfolio-list">
                {portfolio.highlights.map((item) => (
                  <li key={item.id}>
                    <span>{item.title}</span>
                    {(item.discipline || item.assignee) ? (
                      <span className="portfolio-meta">{[item.discipline, item.assignee].filter(Boolean).join(' · ')}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {portfolio.milestones.length ? (
            <section className="portfolio-section">
              <h3>Milestones</h3>
              <ul className="portfolio-list">
                {portfolio.milestones.map((boss) => (
                  <li key={boss.id}><span><TrophyIcon size={13} /> {boss.name}</span></li>
                ))}
              </ul>
            </section>
          ) : null}

          {portfolio.docs.length ? (
            <section className="portfolio-section">
              <h3>Documentation</h3>
              <ul className="portfolio-list">
                {portfolio.docs.map((doc) => (
                  <li key={doc.id}>
                    {doc.url
                      ? <a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.title} <ExternalLinkIcon size={12} /></a>
                      : <span>{doc.title}</span>}
                    {doc.docType ? <span className="portfolio-meta">{doc.docType}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {portfolio.codeLinks.length ? (
            <section className="portfolio-section">
              <h3>Code</h3>
              <ul className="portfolio-list">
                {portfolio.codeLinks.map((link) => (
                  <li key={link.id}>
                    {link.url
                      ? <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} <ExternalLinkIcon size={12} /></a>
                      : <span>{link.label}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {portfolio.nextFocus.length ? (
            <section className="portfolio-section">
              <h3>What is next</h3>
              <ul className="portfolio-list">
                {portfolio.nextFocus.map((task) => <li key={task.id}><span>{task.title}</span></li>)}
              </ul>
            </section>
          ) : null}
        </article>
      )}
    </section>
  )
}
