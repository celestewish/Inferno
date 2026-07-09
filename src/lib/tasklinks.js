// Pure helpers for task-level code and docs links. A task can carry GitHub/code
// references (repo, PR, issue, branch, commit) and doc links inline. These build
// on the existing Code Forge and Docs Hub URL parsing/validation so behavior is
// consistent with those features and external links are always safe (http/https).

import { parseGitHubResourceUrl, resourceTypeLabel } from './codeforge.js'
import { isValidDocUrl, docDomain } from './docs.js'

const clip = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ref_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`)

export const CODE_REF_MAX = 12
export const DOC_REF_MAX = 12

// Validate + normalize a code link before it is attached to a task. Accepts any
// GitHub URL (repo/PR/issue/branch/commit); the type is parsed for a badge, and
// a sensible default label is derived when the user leaves the label blank.
export function buildCodeRef(input = {}) {
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  if (!url) return { ok: false, error: 'A link is required.' }
  const parsed = parseGitHubResourceUrl(url)
  if (!parsed) {
    // Allow non-GitHub code hosts too, as long as they are safe http(s) links.
    if (!isValidDocUrl(url)) return { ok: false, error: 'Enter a valid GitHub or http(s) link.' }
    const label = clip(input.label, 120) || docDomain(url) || 'Code link'
    return { ok: true, value: { id: input.id || newId(), url, label, type: 'other' } }
  }
  const number = parsed.number ? ` #${parsed.number}` : ''
  const defaultLabel = `${parsed.owner}/${parsed.repo}${number}`
  const label = clip(input.label, 120) || defaultLabel
  return { ok: true, value: { id: input.id || newId(), url, label, type: parsed.type } }
}

// Validate + normalize a doc link before it is attached to a task.
export function buildDocRef(input = {}) {
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  if (!url) return { ok: false, error: 'A link is required.' }
  if (!isValidDocUrl(url)) return { ok: false, error: 'Enter a valid http or https link.' }
  const title = clip(input.title, 200) || docDomain(url) || 'Doc link'
  const docType = clip(input.docType, 60) || 'Doc'
  return { ok: true, value: { id: input.id || newId(), url, title, docType } }
}

// Add a validated ref to a list (immutably), enforcing a max and skipping exact
// duplicate URLs. Returns { ok, list?, error? }.
export function addRef(list, ref, max) {
  const current = Array.isArray(list) ? list : []
  if (current.length >= max) return { ok: false, error: 'Link limit reached.' }
  if (current.some((r) => r.url === ref.url)) return { ok: false, error: 'That link is already attached.' }
  return { ok: true, list: [...current, ref] }
}

export function removeRef(list, id) {
  return (Array.isArray(list) ? list : []).filter((r) => r.id !== id)
}

export { resourceTypeLabel }
