import { TEMPLATES, templateTaskCount } from '../lib/templates'
import { TemplateIcon, TasksIcon, BookIcon, PlusIcon } from './Icons'

// Templates library. Static starter packs a team can apply to the current
// project to generate backlog tasks (and suggested docs). Applying is confirmed
// upstream in App because it can create many tasks at once.
export default function TemplatesView({ currentProjectName = '', onApply }) {
  return (
    <section className="templates-view" data-testid="templates-view" aria-label="Templates">
      <header className="view-header">
        <div>
          <p className="eyebrow">Starter packs</p>
          <h1>Templates</h1>
          <p className="muted-copy">
            {currentProjectName
              ? `Apply a starter pack to ${currentProjectName} to skip the blank page.`
              : 'Pick a project first, then apply a starter pack to fill your backlog.'}
          </p>
        </div>
      </header>

      <div className="templates-grid">
        {TEMPLATES.map((template) => {
          const count = templateTaskCount(template)
          const docCount = Array.isArray(template.docs) ? template.docs.length : 0
          return (
            <article key={template.id} className="template-card" data-testid="template-card">
              <div className="template-card-head">
                <span className="template-card-icon" aria-hidden="true"><TemplateIcon size={18} /></span>
                <h2>{template.name}</h2>
              </div>
              <p className="template-card-summary">{template.summary}</p>
              <div className="template-card-meta">
                <span><TasksIcon size={13} /> {count} tasks</span>
                {docCount ? <span><BookIcon size={13} /> {docCount} doc</span> : null}
              </div>
              <button
                type="button"
                className="primary-btn template-apply"
                data-testid="template-apply"
                disabled={!onApply}
                onClick={() => onApply?.(template.id)}
              >
                <PlusIcon size={14} /> Apply to project
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
