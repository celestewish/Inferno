// Small, framework-free URL guards shared across the app. Kept here (rather than
// in a feature module) because avatars, links, and images are used everywhere.

// True only for an absolute http(s) URL. Everything else (relative paths,
// javascript:, data:, mailto:, ftp:, blank) is rejected so a stored value can
// never turn into an unexpected navigation or resource load.
export function isHttpUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const { protocol } = new URL(trimmed)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

// Returns the URL only when it is a safe http(s) image source, otherwise ''.
// Use for any <img src> fed by user-supplied data (e.g. a profile avatar URL) so
// a hostile data:/javascript: value is dropped rather than rendered.
export function safeImageUrl(url) {
  return isHttpUrl(url) ? url.trim() : ''
}
