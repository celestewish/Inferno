// Optional, dependency-free browser error monitoring.
//
// This adds no third-party SDK and no cost. It only does anything when
// VITE_ERROR_MONITOR_URL is set at build time: in that case it forwards
// uncaught errors and unhandled promise rejections to that endpoint with a
// small JSON payload (sent with navigator.sendBeacon so it never blocks the
// page). When the variable is unset, initErrorMonitor() is a no-op, so local
// dev and the default production build are completely unaffected.
//
// The endpoint can be any collector you control (a Supabase Edge Function, a
// serverless function, or a hosted service that accepts a JSON POST). If you
// later adopt a full product like Sentry, replace the body of this module with
// its SDK init; the single call site in main.jsx stays the same.

function post(url, payload) {
  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never let error reporting throw and mask the original error.
  }
}

export function initErrorMonitor() {
  const url = import.meta.env.VITE_ERROR_MONITOR_URL
  if (!url || typeof window === 'undefined') return

  const base = () => ({
    url: window.location.href,
    userAgent: navigator.userAgent,
    at: new Date().toISOString(),
  })

  window.addEventListener('error', (event) => {
    post(url, {
      ...base(),
      kind: 'error',
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error && event.error.stack ? String(event.error.stack) : undefined,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    post(url, {
      ...base(),
      kind: 'unhandledrejection',
      message: reason && reason.message ? String(reason.message) : String(reason),
      stack: reason && reason.stack ? String(reason.stack) : undefined,
    })
  })
}
