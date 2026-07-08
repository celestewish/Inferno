// Canonical site URL for auth redirects and invite links.
// Configure per-environment with VITE_SITE_URL; falls back to production.
const DEFAULT_SITE_URL = 'https://infernotaskboard.com/'

export const siteUrl = (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')

export const buildInviteUrl = (token) => `${siteUrl}/?invite=${encodeURIComponent(token)}`
