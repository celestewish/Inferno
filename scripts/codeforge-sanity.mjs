// Lightweight sanity checks for the Code Forge helpers. No test framework — run
// with `node scripts/codeforge-sanity.mjs`. Exits non-zero on failure.
import {
  REPO_PROVIDER,
  normalizeGitHubRepoUrl,
  parseGitHubRepoUrl,
  parseGitHubResourceUrl,
  isValidGitHubRepoUrl,
  resourceTypeLabel,
  cloneCommand,
  validateRepoInput,
  filterRepos,
} from '../src/lib/codeforge.js'

let failures = 0
const assert = (cond, message) => {
  if (cond) {
    console.log(`  ok  ${message}`)
  } else {
    failures += 1
    console.error(`FAIL  ${message}`)
  }
}

// provider
assert(REPO_PROVIDER === 'github', 'the MVP provider is github')

// parseGitHubRepoUrl
assert(JSON.stringify(parseGitHubRepoUrl('https://github.com/owner/repo')) === JSON.stringify({ owner: 'owner', repo: 'repo' }), 'parses a plain https repo url')
assert(parseGitHubRepoUrl('https://github.com/owner/repo.git').repo === 'repo', 'strips a .git suffix')
assert(parseGitHubRepoUrl('http://github.com/owner/repo').owner === 'owner', 'accepts http')
assert(parseGitHubRepoUrl('github.com/owner/repo').owner === 'owner', 'accepts a scheme-less host path')
assert(parseGitHubRepoUrl('https://www.github.com/owner/repo').owner === 'owner', 'accepts www.github.com')
assert(parseGitHubRepoUrl('https://github.com/owner/repo/').repo === 'repo', 'ignores a trailing slash')
assert(parseGitHubRepoUrl('https://github.com/owner/repo/issues/3').repo === 'repo', 'reads owner/repo from a deep url')
assert(parseGitHubRepoUrl('https://github.com/owner') === null, 'a single-segment path is not a repo')
assert(parseGitHubRepoUrl('https://gitlab.com/owner/repo') === null, 'a non-github host is rejected')
assert(parseGitHubRepoUrl('https://evilgithub.com/owner/repo') === null, 'a lookalike host is rejected')
assert(parseGitHubRepoUrl('not a url') === null, 'garbage is rejected')
assert(parseGitHubRepoUrl('') === null, 'empty string is rejected')
assert(parseGitHubRepoUrl(null) === null, 'null is rejected')
assert(parseGitHubRepoUrl('javascript:alert(1)') === null, 'javascript: is rejected')

// isValidGitHubRepoUrl
assert(isValidGitHubRepoUrl('https://github.com/a/b') === true, 'valid repo url is valid')
assert(isValidGitHubRepoUrl('https://github.com/') === false, 'root github is invalid')
assert(isValidGitHubRepoUrl('ftp://github.com/a/b') === false, 'ftp scheme is invalid')

// normalizeGitHubRepoUrl
assert(normalizeGitHubRepoUrl('github.com/owner/repo.git/') === 'https://github.com/owner/repo', 'normalizes scheme, .git, and trailing slash')
assert(normalizeGitHubRepoUrl('http://www.github.com/Owner/Repo') === 'https://github.com/Owner/Repo', 'normalizes to https and drops www, preserving case')
assert(normalizeGitHubRepoUrl('https://github.com/o/r/pull/5') === 'https://github.com/o/r', 'strips extra resource path')
assert(normalizeGitHubRepoUrl('bad') === '', 'invalid input normalizes to empty string')

// parseGitHubResourceUrl
assert(parseGitHubResourceUrl('https://github.com/o/r').type === 'repo', 'bare repo url is type repo')
const issue = parseGitHubResourceUrl('https://github.com/o/r/issues/42')
assert(issue.type === 'issue' && issue.number === 42, 'parses an issue number')
const pull = parseGitHubResourceUrl('https://github.com/o/r/pull/7')
assert(pull.type === 'pull' && pull.number === 7, 'parses a pull request number')
const commit = parseGitHubResourceUrl('https://github.com/o/r/commit/abc123')
assert(commit.type === 'commit' && commit.ref === 'abc123', 'parses a commit ref')
const branch = parseGitHubResourceUrl('https://github.com/o/r/tree/feature/x')
assert(branch.type === 'branch' && branch.ref === 'feature/x', 'parses a branch ref with slashes')
assert(parseGitHubResourceUrl('https://github.com/o/r/wiki').type === 'other', 'unknown sub-path is type other')
assert(parseGitHubResourceUrl('https://gitlab.com/o/r') === null, 'non-github resource url is null')

// resourceTypeLabel
assert(resourceTypeLabel('pull') === 'Pull Request', 'labels a pull request')
assert(resourceTypeLabel('issue') === 'Issue', 'labels an issue')
assert(resourceTypeLabel('unknown') === 'Link', 'unknown type falls back to Link')

// cloneCommand
assert(cloneCommand('github.com/o/r') === 'git clone https://github.com/o/r.git', 'builds a clone command')
assert(cloneCommand('bad') === '', 'no clone command for invalid input')

// validateRepoInput
const bad = validateRepoInput({ repoUrl: '' })
assert(bad.ok === false && bad.errors.repoUrl, 'a missing url is flagged')
const badHost = validateRepoInput({ repoUrl: 'https://gitlab.com/o/r' })
assert(badHost.ok === false && badHost.errors.repoUrl, 'a non-github url is flagged')
const good = validateRepoInput({ repoUrl: '  github.com/Owner/Repo.git  ', projectId: 'p1', description: '  hub  ' })
assert(good.ok === true, 'a well-formed repo is valid')
assert(good.value.repoUrl === 'https://github.com/Owner/Repo', 'url is normalized')
assert(good.value.displayName === 'Owner/Repo', 'display name defaults to owner/repo')
assert(good.value.owner === 'Owner' && good.value.repo === 'Repo', 'owner and repo are extracted')
assert(good.value.provider === 'github', 'provider is github')
assert(good.value.description === 'hub', 'description is trimmed')
assert(good.value.projectId === 'p1', 'projectId is carried through')
const named = validateRepoInput({ repoUrl: 'github.com/o/r', displayName: '  Inferno Core  ' })
assert(named.value.displayName === 'Inferno Core', 'a provided display name is trimmed and kept')
const longName = validateRepoInput({ repoUrl: 'github.com/o/r', displayName: 'x'.repeat(121) })
assert(longName.ok === false && longName.errors.displayName, 'an overlong display name is flagged')
const noProject = validateRepoInput({ repoUrl: 'github.com/o/r', projectId: '' })
assert(noProject.value.projectId === null, 'a blank projectId becomes null')

// filterRepos
const repos = [
  { id: 'r1', displayName: 'Engine', owner: 'acme', repo: 'engine', projectId: 'p1' },
  { id: 'r2', displayName: 'Website', owner: 'acme', repo: 'web', projectId: 'p2' },
  { id: 'r3', displayName: 'Old', owner: 'acme', repo: 'old', projectId: 'p1', archivedAt: '2026-07-01T00:00:00Z' },
  { id: 'r4', displayName: 'Loose', owner: 'zzz', repo: 'loose', projectId: null },
]
assert(filterRepos(repos).map((r) => r.id).join(',') === 'r1,r2,r4', 'archived repos are excluded by default')
assert(filterRepos(repos, { projectId: 'p1' }).map((r) => r.id).join(',') === 'r1', 'project filter narrows results')
assert(filterRepos(repos, { projectId: 'none' }).map((r) => r.id).join(',') === 'r4', 'the "none" filter finds project-less repos')
assert(filterRepos(repos, { search: 'web' }).map((r) => r.id).join(',') === 'r2', 'search matches repo slug')
assert(filterRepos(repos, { search: 'zzz' }).map((r) => r.id).join(',') === 'r4', 'search matches owner')
assert(filterRepos(repos, { search: 'engine' }).map((r) => r.id).join(',') === 'r1', 'search matches display name')
assert(filterRepos([]).length === 0, 'an empty list filters to nothing')

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll Code Forge sanity checks passed.')
