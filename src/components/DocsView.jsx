import { useMemo, useState } from 'react'
import {
  DOC_TYPES,
  DEFAULT_DOC_TYPE,
  filterDocs,
  countDocsByType,
  docDomain,
  validateDocInput,
} from '../lib/docs'
import {
  BookIcon,
  PlusIcon,
  SearchIcon,
  ExternalLinkIcon,
  EditIcon,
  ArchiveIcon,
  CloseIcon,
} from './Icons'

const EMPTY_FORM = {
  title: '',
  url: '',
  docType: DEFAULT_DOC_TYPE,
  projectId: '',
  description: '',
}

// Docs Hub: a metadata-only library of external documents (design docs, tech
// plans, art direction, QA notes, postmortems) linked to the active board.
export default function DocsView({
  docs = [],
  projects = [],
  onCreateDoc,
  onUpdateDoc,
  onArchiveDoc,
  migrationMissing = false,
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const projectName = useMemo(() => {
    const map = new Map(projects.map((project) => [project.id, project.name]))
    return (id) => (id ? map.get(id) || 'Unknown project' : null)
  }, [projects])

  const visibleDocs = useMemo(
    () => filterDocs(docs, { search, docType: typeFilter, projectId: projectFilter }),
    [docs, search, typeFilter, projectFilter],
  )
  const typeCounts = useMemo(() => countDocsByType(docs), [docs])
  const activeCount = useMemo(() => docs.filter((doc) => !doc.archivedAt).length, [docs])

  const openCreate = () => {
    setEditingDoc(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (doc) => {
    setEditingDoc(doc)
    setForm({
      title: doc.title || '',
      url: doc.url || '',
      docType: doc.docType || DEFAULT_DOC_TYPE,
      projectId: doc.projectId || '',
      description: doc.description || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingDoc(null)
  }

  const submitForm = async (event) => {
    event.preventDefault()
    const result = validateDocInput(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSubmitting(true)
    const handler = editingDoc
      ? onUpdateDoc?.(editingDoc.id, result.value)
      : onCreateDoc?.(result.value)
    const outcome = (await handler) || { ok: false }
    setSubmitting(false)
    if (outcome.ok) {
      setModalOpen(false)
      setEditingDoc(null)
      setForm(EMPTY_FORM)
    } else if (outcome.message) {
      setErrors({ form: outcome.message })
    }
  }

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  return (
    <section className="docs-view" data-testid="docs-view" aria-label="Docs Hub">
      <header className="view-header docs-header">
        <div>
          <p className="eyebrow">Studio Grimoire</p>
          <h1>Docs Hub</h1>
          <p className="muted-copy">
            Keep every design note, tech plan, and postmortem beside the work it supports.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn docs-link-btn"
          data-testid="docs-link-doc"
          onClick={openCreate}
        >
          <PlusIcon size={15} />
          <span>Link Doc</span>
        </button>
      </header>

      {migrationMissing ? (
        <div className="docs-migration-note" role="status" data-testid="docs-migration-note">
          Docs Hub needs its database migration. Run <code className="chat-code">supabase db push</code> to
          start linking docs. The rest of Inferno keeps working.
        </div>
      ) : null}

      <div className="docs-toolbar" data-testid="docs-toolbar">
        <div className="docs-search">
          <span className="docs-search-icon" aria-hidden="true"><SearchIcon size={15} /></span>
          <input
            type="search"
            className="docs-search-input"
            placeholder="Search by title"
            aria-label="Search docs by title"
            data-testid="docs-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="docs-filter">
          <span className="docs-filter-label">Type</span>
          <select
            className="docs-select"
            data-testid="docs-filter-type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="docs-filter">
          <span className="docs-filter-label">Project</span>
          <select
            className="docs-select"
            data-testid="docs-filter-project"
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          >
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="docs-stats" data-testid="docs-stats">
        <span className="docs-stat is-total">{activeCount} linked</span>
        {DOC_TYPES.filter((type) => typeCounts[type]).map((type) => (
          <span key={type} className="docs-stat">{type} · {typeCounts[type]}</span>
        ))}
      </div>

      {visibleDocs.length ? (
        <ul className="docs-grid" data-testid="docs-grid">
          {visibleDocs.map((doc) => {
            const domain = docDomain(doc.url)
            const linkedProject = projectName(doc.projectId)
            return (
              <li key={doc.id} className="docs-card" data-testid="docs-card">
                <div className="docs-card-top">
                  <span className="docs-type-badge" data-testid="docs-type-badge">{doc.docType}</span>
                  <div className="docs-card-actions">
                    <button
                      type="button"
                      className="docs-icon-btn"
                      data-testid="docs-edit"
                      aria-label={`Edit ${doc.title}`}
                      title="Edit"
                      onClick={() => openEdit(doc)}
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="docs-icon-btn"
                      data-testid="docs-archive"
                      aria-label={`Archive ${doc.title}`}
                      title="Archive"
                      onClick={() => onArchiveDoc?.(doc)}
                    >
                      <ArchiveIcon size={14} />
                    </button>
                  </div>
                </div>
                <h2 className="docs-card-title">{doc.title}</h2>
                {doc.description ? (
                  <p className="docs-card-desc">{doc.description}</p>
                ) : null}
                <div className="docs-card-meta">
                  {linkedProject ? (
                    <span className="docs-card-project">{linkedProject}</span>
                  ) : null}
                  <a
                    className="docs-open-link"
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="docs-open"
                  >
                    <ExternalLinkIcon size={13} />
                    <span>{domain || 'Open Doc'}</span>
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="docs-empty" data-testid="docs-empty">
          <span className="docs-empty-icon" aria-hidden="true"><BookIcon size={30} /></span>
          <p className="docs-empty-title">No docs linked yet. Start your studio grimoire.</p>
          <p className="muted-copy">
            Attach design bibles, tech plans, QA notes, and postmortems to your board.
          </p>
        </div>
      )}

      {modalOpen ? (
        <div className="docs-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="docs-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label={editingDoc ? 'Edit doc' : 'Link a doc'}
            data-testid="docs-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="docs-modal-head">
              <h2>{editingDoc ? 'Edit Doc' : 'Link Doc'}</h2>
              <button
                type="button"
                className="docs-icon-btn"
                aria-label="Close"
                data-testid="docs-modal-close"
                onClick={closeModal}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <form className="docs-form" onSubmit={submitForm}>
              <label className="docs-field">
                <span>Title</span>
                <input
                  type="text"
                  value={form.title}
                  maxLength={200}
                  autoFocus
                  data-testid="docs-form-title"
                  aria-invalid={errors.title ? 'true' : undefined}
                  onChange={(event) => setField('title', event.target.value)}
                />
                {errors.title ? <small className="docs-error">{errors.title}</small> : null}
              </label>
              <label className="docs-field">
                <span>Link (http or https)</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://docs.google.com/..."
                  value={form.url}
                  data-testid="docs-form-url"
                  aria-invalid={errors.url ? 'true' : undefined}
                  onChange={(event) => setField('url', event.target.value)}
                />
                {errors.url ? <small className="docs-error">{errors.url}</small> : null}
              </label>
              <div className="docs-field-row">
                <label className="docs-field">
                  <span>Type</span>
                  <select
                    className="docs-select"
                    value={form.docType}
                    data-testid="docs-form-type"
                    onChange={(event) => setField('docType', event.target.value)}
                  >
                    {DOC_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="docs-field">
                  <span>Project (optional)</span>
                  <select
                    className="docs-select"
                    value={form.projectId}
                    data-testid="docs-form-project"
                    onChange={(event) => setField('projectId', event.target.value)}
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="docs-field">
                <span>Description (optional)</span>
                <textarea
                  rows={3}
                  value={form.description}
                  maxLength={2000}
                  data-testid="docs-form-description"
                  onChange={(event) => setField('description', event.target.value)}
                />
                {errors.description ? <small className="docs-error">{errors.description}</small> : null}
              </label>
              {errors.form ? <small className="docs-error">{errors.form}</small> : null}
              <div className="docs-form-actions">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                  data-testid="docs-form-submit"
                >
                  {submitting ? 'Saving…' : editingDoc ? 'Save changes' : 'Link Doc'}
                </button>
                <button type="button" className="ghost-btn" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
