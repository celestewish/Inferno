import { useEffect, useState } from 'react'
import { siteUrl } from '../lib/site'

// Delay before the banner appears, so guests get a chance to actually look at
// the board before being nudged toward signup. Tune here.
export const GUEST_BANNER_DELAY_MS = 45_000

export default function GuestSignupBanner({ boardName }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), GUEST_BANNER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible || dismissed) return null

  return (
    <div className="guest-signup-banner" role="complementary" aria-label="Create a free account" data-testid="guest-signup-banner">
      <p>
        You're viewing <strong>{boardName}</strong> as a guest. Create a free account to comment, get notified, and collaborate.
      </p>
      <div className="guest-signup-banner-actions">
        <a className="primary-btn" href={siteUrl}>Create free account</a>
        <button type="button" className="secondary-btn" onClick={() => setDismissed(true)}>Not now</button>
      </div>
    </div>
  )
}
