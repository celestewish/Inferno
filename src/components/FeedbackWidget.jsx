import { useEffect, useRef, useState } from 'react'

// Non-invasive feedback launcher. Renders a small floating
// button in the authenticated app only (never on the signed-out landing). It
// opens a popover with two low-friction paths: file a GitHub bug report using
// the repo's issue template, or send feedback by email. No paid services and no
// third-party scripts; both actions are plain links.
const BUG_REPORT_URL =
  'https://github.com/celestewish/Inferno/issues/new?template=bug_report.yml'
const FEEDBACK_EMAIL = 'celeste@infernotaskboard.com'

export default function FeedbackWidget({ activeSection }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const mailtoHref = () => {
    const subject = encodeURIComponent('Inferno feedback')
    const body = encodeURIComponent(
      [
        'What section were you on: ' + (activeSection || 'unknown'),
        'Browser and device: ',
        '',
        'What happened: ',
        '',
        'What you expected: ',
      ].join('\n'),
    )
    return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="feedback-widget" ref={rootRef} data-testid="feedback-widget">
      {open ? (
        <div className="feedback-popover" role="dialog" aria-label="Send feedback">
          <p className="feedback-popover-title">Help shape Inferno</p>
          <p className="feedback-popover-copy">
            We would love your input. Tell us what broke or what you would change.
          </p>
          <a
            className="primary-btn feedback-action"
            href={BUG_REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="feedback-bug"
            onClick={() => setOpen(false)}
          >
            Report a bug on GitHub
          </a>
          <a
            className="secondary-btn feedback-action"
            href={mailtoHref()}
            data-testid="feedback-email"
            onClick={() => setOpen(false)}
          >
            Send feedback by email
          </a>
          <p className="feedback-legal">
            <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>
            <span aria-hidden="true"> · </span>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
          </p>
          <p className="feedback-company">&copy; 2026 Rousell Technologies LLC</p>
        </div>
      ) : null}
      <button
        type="button"
        className="feedback-toggle"
        data-testid="feedback-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Send feedback"
        title="Send feedback"
        onClick={() => setOpen((current) => !current)}
      >
        Feedback
      </button>
    </div>
  )
}
