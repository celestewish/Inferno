// Pure helpers for Code Forge (metadata-only registry of external code repos).
// No React, no Supabase, so GitHub URL parsing / validation / filtering can be
// unit-tested with plain Node.

// Only GitHub is supported in the MVP. We store the provider on each repo so more
// hosts can be added later without a schema change.
export const REPO_PROVIDER = 'github'

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com'])

// GitHub owner/repo name rules (loose but safe): letters, digits, dot, dash,
// underscore. We reject empty and the reserved '.'/'..' segments.
const NAME_RE = /^[A-Za-z0-9._-]+$/

function isName(segment) {
  return typeof segment === 'string' && NAME_RE.test(segment) && segment !== '.' && segment !== '..'
}

// Parse any GitHub input into a URL object rooted at github.com. Accepts inputs
// with or without a scheme (github.com/owner/repo), http or https, and www. Any
// non-GitHub host or unparseable input returns null.
function toGitHubUrl(input) {
  if (typeof input !== 'string') return null
  let trimmed = input.trim()
  if (!trimmed) return null
  // Add a scheme when the input is a bare host path so new URL() can parse it.
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^github\.com\//i.test(trimmed) || /^www\.github\.com\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`
    } else {
      return null
    }
  }
  let url
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) return null
  return url
}

// Split a GitHub URL path into clean segments, dropping empty parts.
function pathSegments(url) {
  return url.pathname.split('/').filter(Boolean)
}

// Strip a trailing .git from a repo segment.
function stripGit(repo) {
  return repo.replace(/\.git$/i, '')
}

// { owner, repo } for a GitHub URL/path, or null if it does not name a repo.
// Tolerates extra path (issues, pull, tree, etc.) by reading the first two parts.
export function parseGitHubRepoUrl(input) {
  const url = toGitHubUrl(input)
  if (!url) return null
  const parts = pathSegments(url)
  if (parts.length < 2) return null
  const owner = parts[0]
  const repo = stripGit(parts[1])
  if (!isName(owner) || !isName(repo)) return null
  return { owner, repo }
}

// True when the input points at a real GitHub repo (owner + repo present).
export function isValidGitHubRepoUrl(input) {
  return parseGitHubRepoUrl(input) !== null
}

// Canonical form: https://github.com/owner/repo (no scheme drift, no .git, no
// trailing slash, no extra path). Returns '' for anything that is not a repo.
export function normalizeGitHubRepoUrl(input) {
  const parsed = parseGitHubRepoUrl(input)
  if (!parsed) return ''
  return `https://github.com/${parsed.owner}/${parsed.repo}`
}

// Map a GitHub sub-path to a friendly resource type. Returns { owner, repo, type,
// number?, ref? }. type is one of: repo, issue, pull, commit, branch, release,
// other. Numbers are parsed for issues/pulls; refs for commit/branch.
export function parseGitHubResourceUrl(input) {
  const base = parseGitHubRepoUrl(input)
  if (!base) return null
  const url = toGitHubUrl(input)
  const parts = pathSegments(url).slice(2) // drop owner/repo
  const result = { owner: base.owner, repo: base.repo, type: 'repo' }
  if (parts.length === 0) return result

  const [kind, ...rest] = parts
  switch (kind.toLowerCase()) {
    case 'issues':
      if (rest[0] && /^\d+$/.test(rest[0])) {
        result.type = 'issue'
        result.number = Number(rest[0])
      } else {
        result.type = 'issue'
      }
      return result
    case 'pull':
      if (rest[0] && /^\d+$/.test(rest[0])) {
        result.type = 'pull'
        result.number = Number(rest[0])
      } else {
        result.type = 'pull'
      }
      return result
    case 'commit':
      result.type = 'commit'
      if (rest[0]) result.ref = rest[0]
      return result
    case 'tree':
    case 'branch':
      result.type = 'branch'
      if (rest.length) result.ref = rest.join('/')
      return result
    case 'releases':
      result.type = 'release'
      return result
    default:
      result.type = 'other'
      return result
  }
}

// Human label for a parsed resource type, for badges on task code links.
export function resourceTypeLabel(type) {
  switch (type) {
    case 'issue': return 'Issue'
    case 'pull': return 'Pull Request'
    case 'commit': return 'Commit'
    case 'branch': return 'Branch'
    case 'release': return 'Release'
    case 'repo': return 'Repository'
    default: return 'Link'
  }
}

// Suggested git clone command for a normalized repo URL. '' if not a repo.
export function cloneCommand(repoUrl) {
  const normalized = normalizeGitHubRepoUrl(repoUrl)
  if (!normalized) return ''
  return `git clone ${normalized}.git`
}

// Validate + normalize a repo form payload before it hits the database. Returns
// { ok, value?, errors? } where errors is keyed by field for inline messages.
// display_name defaults to the parsed "owner/repo" when the user leaves it blank.
export function validateRepoInput(input = {}) {
  const errors = {}
  const rawUrl = typeof input.repoUrl === 'string' ? input.repoUrl.trim() : ''
  const rawName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''

  const parsed = rawUrl ? parseGitHubRepoUrl(rawUrl) : null
  if (!rawUrl) errors.repoUrl = 'A GitHub repository URL is required.'
  else if (!parsed) errors.repoUrl = 'Enter a valid GitHub repo URL (https://github.com/owner/repo).'

  if (rawName.length > 120) errors.displayName = 'Keep the name under 120 characters.'
  if (description.length > 2000) errors.description = 'Keep the description under 2000 characters.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const displayName = rawName || `${parsed.owner}/${parsed.repo}`

  return {
    ok: true,
    value: {
      displayName,
      repoUrl: normalizeGitHubRepoUrl(rawUrl),
      owner: parsed.owner,
      repo: parsed.repo,
      provider: REPO_PROVIDER,
      description,
      projectId: input.projectId || null,
    },
  }
}

// Filter repos by free-text search (name/owner/repo), and project. Archived repos
// are excluded up front. Filters use the sentinel 'all' to mean "no filter" and
// 'none' (project) to mean "repos with no project".
export function filterRepos(repos = [], { search = '', projectId = 'all' } = {}) {
  const list = Array.isArray(repos) ? repos : []
  const needle = search.trim().toLowerCase()
  return list.filter((repo) => {
    if (!repo || repo.archivedAt) return false
    if (projectId !== 'all') {
      if (projectId === 'none') {
        if (repo.projectId) return false
      } else if (repo.projectId !== projectId) {
        return false
      }
    }
    if (needle) {
      const haystack = [repo.displayName, repo.owner, repo.repo]
        .map((v) => String(v || '').toLowerCase())
        .join(' ')
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}
