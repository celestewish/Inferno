// Canonical site URL for auth redirects and invite links.
// Configure per-environment with VITE_SITE_URL; falls back to production.
const DEFAULT_SITE_URL = 'https://infernotaskboard.com/'

export const siteUrl = (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')

export const buildInviteUrl = (token) => `${siteUrl}/?invite=${encodeURIComponent(token)}`

// Guest links are read via a plain query param (like invites above) since the
// app has no router to hang a `/guest/:token` path off of, and the static
// host has no SPA-fallback rewrite rule configured for deep paths.
export const buildGuestLinkUrl = (token) => `${siteUrl}/?guest=${encodeURIComponent(token)}`
