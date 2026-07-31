// Meta Pixel + Conversions API event tracking.
//
// Each call fires two things with a shared event_id so Meta dedupes them:
//   1. The browser Pixel (window.fbq, loaded in index.html), for ad-blocked-free
//      visitors.
//   2. The send-capi-event Supabase Edge Function, which re-sends the event
//      server-side (unaffected by ad blockers) and holds the Meta access token.
// If fbq is missing (blocked) or the edge function call fails, tracking is
// skipped silently — it must never break the feature it's attached to.
import { supabase } from './supabase'

// Reads the given cookie set by the base Meta Pixel script (_fbp on every
// visit, _fbc only when the visit came from a Facebook/Instagram ad click).
// These are anonymous browser identifiers, not PII — sending them is what
// lets Meta accept events that otherwise have no other matching signal.
function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function trackEvent(eventName, { email } = {}) {
  if (typeof window === 'undefined') return

  const eventId = crypto.randomUUID()
  const eventSourceUrl = window.location.href
  const eventTime = Math.floor(Date.now() / 1000)

  if (typeof window.fbq === 'function') {
    window.fbq('track', eventName, {}, { eventID: eventId })
  }

  supabase.functions
    .invoke('send-capi-event', {
      body: {
        event_name: eventName,
        event_id: eventId,
        event_source_url: eventSourceUrl,
        event_time: eventTime,
        action_source: 'website',
        client_user_agent: navigator.userAgent,
        email: email || undefined,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
      },
    })
    .catch((error) => console.error('CAPI event failed:', error))
}

export const trackCompleteRegistration = (email) => trackEvent('CompleteRegistration', { email })
export const trackContact = () => trackEvent('Contact')
export const trackViewContent = () => trackEvent('ViewContent')
