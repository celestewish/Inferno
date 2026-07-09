import { useMemo, useState } from 'react'
import { filterRepos, validateRepoInput, cloneCommand } from '../lib/codeforge'
import {
  ForgeIcon,
  PlusIcon,
  SearchIcon,
  ExternalLinkIcon,
  EditIcon,
  ArchiveIcon,
  CloseIcon,
  CopyIcon,
} from './Icons'

const EMPTY_FORM = {
  repoUrl: '',
  displayName: '',
  projectId: '',
  description: '',
}

// Code Forge: a metadata-only registry of external code repositories (GitHub for
// the MVP) linked to the active board. No credentials, code, or files are stored.
export default function CodeForgeView({
  repos = [],
  projects = [],
  onCreateRepo,
  onUpdateRepo,
  onArchiveRepo,
  migrationMissing = false,
  accessError = false,
}) {
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRepo, setEditingRepo] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const projectName = useMemo(() => {
    const map = new Map(projects.map((project) => [project.id, project.name]))
    return (id) => (id ? map.get(id) || 'Unknown project' : null)
  }, [projects])

  const visibleRepos = useMemo(
    () => filterRepos(repos, { search, projectId: projectFilter }),
    [repos, search, projectFilter],
  )
  const activeCount = useMemo(() => repos.filter((repo) => !repo.archivedAt).length, [repos])

  const openCreate = () => {
    setEditingRepo(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (repo) => {
    setEditingRepo(repo)
    setForm({
      repoUrl: repo.repoUrl || '',
      displayName: repo.displayName || '',
      projectId: repo.projectId || '',
      description: repo.description || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingRepo(null)
  }

  const submitForm = async (event) => {
    event.preventDefault()
    const result = validateRepoInput(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSubmitting(true)
    const handler = editingRepo
      ? onUpdateRepo?.(editingRepo.id, result.value)
      : onCreateRepo?.(result.value)
    const outcome = (await handler) || { ok: false }
    setSubmitting(false)
    if (outcome.ok) {
      setModalOpen(false)
      setEditingRepo(null)
      setForm(EMPTY_FORM)
    } else if (outcome.message) {
      setErrors({ form: outcome.message })
    }
  }

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const copyClone = async (repo) => {
    const command = cloneCommand(repo.repoUrl)
    if (!command) return
    try {
      await navigator.clipboard?.writeText(command)
      setCopiedId(repo.id)
      setTimeout(() => setCopiedId((current) => (current === repo.id ? null : current)), 1600)
    } catch {
      // Clipboard can be unavailable (insecure context); fail quietly.
    }
  }

  return (
    <section className="forge-view" data-testid="codeforge-view" aria-label="Code Forge">
      <header className="view-header forge-header">
        <div>
          <p className="eyebrow">Code Forge</p>
          <h1>Code Forge</h1>
          <p className="muted-copy">
            Link repos, PRs, branches, and issues to the work they power.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn forge-link-btn"
          data-testid="codeforge-link-repo"
          onClick={openCreate}
        >
          <PlusIcon size={15} />
          <span>Link Repo</span>
        </button>
      </header>

      {migrationMissing ? (
        <div className="forge-migration-note" role="status" data-testid="codeforge-migration-note">
          Code Forge needs its database migration. Run <code className="chat-code">supabase db push</code> to
          start linking repositories. The rest of Inferno keeps working.
        </div>
      ) : null}

      {accessError ? (
        <div className="forge-migration-note" role="status" data-testid="codeforge-access-note">
          Code Forge could not load. You may need to sign in again, or you do not have access to this
          board's repositories. The rest of Inferno keeps working.
        </div>
      ) : null}

      <div className="forge-toolbar" data-testid="codeforge-toolbar">
        <div className="forge-search">
          <span className="forge-search-icon" aria-hidden="true"><SearchIcon size={15} /></span>
          <input
            type="search"
            className="forge-search-input"
            placeholder="Search by name or owner"
            aria-label="Search repositories"
            data-testid="codeforge-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {projects.length ? (
          <label className="forge-filter">
            <span className="forge-filter-label">Project</span>
            <select
              className="forge-select"
              data-testid="codeforge-filter-project"
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
        ) : null}
      </div>

      <div className="forge-stats" data-testid="codeforge-stats">
        <span className="forge-stat is-total">{activeCount} linked</span>
      </div>

      {visibleRepos.length ? (
        <ul className="forge-grid" data-testid="codeforge-grid">
          {visibleRepos.map((repo) => {
            const linkedProject = projectName(repo.projectId)
            const slug = repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : repo.repoUrl
            return (
              <li key={repo.id} className="forge-card" data-testid="codeforge-card">
                <div className="forge-card-top">
                  <span className="forge-provider-badge" data-testid="codeforge-provider-badge">
                    {repo.provider || 'github'}
                  </span>
                  <div className="forge-card-actions">
                    <button
                      type="button"
                      className="forge-icon-btn"
                      data-testid="codeforge-edit"
                      aria-label={`Edit ${repo.displayName}`}
                      title="Edit"
                      onClick={() => openEdit(repo)}
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="forge-icon-btn"
                      data-testid="codeforge-archive"
                      aria-label={`Archive ${repo.displayName}`}
                      title="Archive"
                      onClick={() => onArchiveRepo?.(repo)}
                    >
                      <ArchiveIcon size={14} />
                    </button>
                  </div>
                </div>
                <h2 className="forge-card-title">{repo.displayName}</h2>
                <p className="forge-card-slug">{slug}</p>
                {repo.description ? (
                  <p className="forge-card-desc">{repo.description}</p>
                ) : null}
                <div className="forge-card-clone">
                  <code className="forge-clone-cmd" data-testid="codeforge-clone">{cloneCommand(repo.repoUrl)}</code>
                  <button
                    type="button"
                    className="forge-icon-btn"
                    data-testid="codeforge-copy"
                    aria-label={`Copy clone command for ${repo.displayName}`}
                    title="Copy clone command"
                    onClick={() => copyClone(repo)}
                  >
                    <CopyIcon size={14} />
                  </button>
                  {copiedId === repo.id ? <span className="forge-copied" role="status">Copied</span> : null}
                </div>
                <div className="forge-card-meta">
                  {linkedProject ? (
                    <span className="forge-card-project">{linkedProject}</span>
                  ) : null}
                  <a
                    className="forge-open-link"
                    href={repo.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="codeforge-open"
                  >
                    <ExternalLinkIcon size={13} />
                    <span>Open GitHub</span>
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="forge-empty" data-testid="codeforge-empty">
          <span className="forge-empty-icon" aria-hidden="true"><ForgeIcon size={30} /></span>
          <p className="forge-empty-title">No repos linked yet. Fire up the forge.</p>
          <p className="muted-copy">
            Link a GitHub repository to connect your code work to the board it powers.
          </p>
        </div>
      )}

      {modalOpen ? (
        <div className="forge-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="forge-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label={editingRepo ? 'Edit repository' : 'Link a repository'}
            data-testid="codeforge-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="forge-modal-head">
              <h2>{editingRepo ? 'Edit Repo' : 'Link Repo'}</h2>
              <button
                type="button"
                className="forge-icon-btn"
                aria-label="Close"
                data-testid="codeforge-modal-close"
                onClick={closeModal}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <form className="forge-form" onSubmit={submitForm}>
              <label className="forge-field">
                <span>GitHub repository URL</span>
                <input
                  type="text"
                  inputMode="url"
                  placeholder="https://github.com/owner/repo"
                  value={form.repoUrl}
                  autoFocus
                  data-testid="codeforge-form-url"
                  aria-invalid={errors.repoUrl ? 'true' : undefined}
                  onChange={(event) => setField('repoUrl', event.target.value)}
                />
                {errors.repoUrl ? <small className="forge-error">{errors.repoUrl}</small> : null}
              </label>
              <label className="forge-field">
                <span>Display name (optional)</span>
                <input
                  type="text"
                  placeholder="Defaults to owner/repo"
                  value={form.displayName}
                  maxLength={120}
                  data-testid="codeforge-form-name"
                  aria-invalid={errors.displayName ? 'true' : undefined}
                  onChange={(event) => setField('displayName', event.target.value)}
                />
                {errors.displayName ? <small className="forge-error">{errors.displayName}</small> : null}
              </label>
              <label className="forge-field">
                <span>Project (optional)</span>
                <select
                  className="forge-select"
                  value={form.projectId}
                  data-testid="codeforge-form-project"
                  onChange={(event) => setField('projectId', event.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="forge-field">
                <span>Description (optional)</span>
                <textarea
                  rows={3}
                  value={form.description}
                  maxLength={2000}
                  data-testid="codeforge-form-description"
                  onChange={(event) => setField('description', event.target.value)}
                />
                {errors.description ? <small className="forge-error">{errors.description}</small> : null}
              </label>
              {errors.form ? <small className="forge-error">{errors.form}</small> : null}
              <div className="forge-form-actions">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                  data-testid="codeforge-form-submit"
                >
                  {submitting ? 'Saving…' : editingRepo ? 'Save changes' : 'Link Repo'}
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
