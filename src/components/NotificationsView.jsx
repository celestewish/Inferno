import { NOTIFICATION_TYPES } from '../lib/notifications'
import {
  TrophyIcon,
  FlameIcon,
  TasksIcon,
  BookIcon,
  TeamIcon,
  BellIcon,
  CheckIcon,
} from './Icons'

const TYPE_ICON = {
  [NOTIFICATION_TYPES.BOSS]: TrophyIcon,
  [NOTIFICATION_TYPES.QUEST]: FlameIcon,
  [NOTIFICATION_TYPES.ACTION]: TasksIcon,
  [NOTIFICATION_TYPES.PINNED]: BookIcon,
  [NOTIFICATION_TYPES.MEMBER]: TeamIcon,
  [NOTIFICATION_TYPES.INVITE]: TeamIcon,
}

// The in-app notifications page. The feed is generated from board data upstream;
// this view renders it and lets the user mark items read.
export default function NotificationsView({
  notifications = [],
  unread = 0,
  migrationMissing = false,
  accessError = false,
  onMarkRead,
  onMarkAllRead,
}) {
  return (
    <section className="notif-view" data-testid="notifications-view" aria-label="Notifications">
      <header className="view-header">
        <div>
          <p className="eyebrow">Signals</p>
          <h1>Notifications</h1>
          <p className="muted-copy">Milestones, action items, and team updates across this board.</p>
        </div>
        {notifications.length ? (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onMarkAllRead?.()}
            disabled={unread === 0}
            data-testid="notif-mark-all"
          >
            <CheckIcon size={15} /> Mark all read
          </button>
        ) : null}
      </header>

      {migrationMissing ? (
        <p className="notif-note" role="status">
          Apply the notifications migration (supabase db push) to remember which alerts you have read.
        </p>
      ) : null}

      {accessError ? (
        <p className="notif-note" role="status" data-testid="notif-access-note">
          Read state could not load. You may need to sign in again. The rest of Inferno keeps working.
        </p>
      ) : null}

      {notifications.length === 0 ? (
        <div className="notif-empty">
          <BellIcon size={26} />
          <p>You are all caught up. New milestones and action items will show here.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] || BellIcon
            return (
              <li
                key={n.key}
                className={n.read ? 'notif-item is-read' : 'notif-item'}
                data-testid="notif-item"
              >
                <span className="notif-icon" aria-hidden="true"><Icon size={17} /></span>
                <div className="notif-body">
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    className="notif-read-btn"
                    aria-label="Mark read"
                    title="Mark read"
                    onClick={() => onMarkRead?.(n.key)}
                    data-testid="notif-mark-one"
                  >
                    <CheckIcon size={15} />
                  </button>
                ) : (
                  <span className="notif-read-tag">Read</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
