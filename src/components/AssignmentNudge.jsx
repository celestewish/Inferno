import { CloseIcon } from './Icons'

// Inline, non-blocking hint shown next to the assignee field on a solo board.
// Visibility/timing/cooldown are decided server-side (should_show_assignment_nudge);
// this component only renders what it's told and reports which CTA was used.
export default function AssignmentNudge({ onInvite, onGuestLink, onDismissForever, onClose }) {
  return (
    <div className="assignment-nudge" role="status" data-testid="assignment-nudge">
      <div className="assignment-nudge-body">
        <p>You're the only one here — want to bring in a teammate instead?</p>
        <div className="assignment-nudge-actions">
          <button type="button" className="secondary-btn" onClick={onInvite}>Send an invite</button>
          <button type="button" className="secondary-btn" onClick={onGuestLink}>Share a view link</button>
          <button type="button" className="link-btn muted assignment-nudge-dismiss" onClick={onDismissForever}>
            Don't show this again
          </button>
        </div>
      </div>
      <button
        type="button"
        className="icon-btn assignment-nudge-close"
        aria-label="Dismiss hint"
        onClick={onClose}
      >
        <CloseIcon size={13} />
      </button>
    </div>
  )
}
