import InlineText from './InlineText'
import { PlusIcon } from './Icons'

const AVATAR_COLORS = ['var(--role-design)', 'var(--role-art)', 'var(--role-code)', 'var(--role-audio)']

const initialOf = (label) => (label || '?').trim().charAt(0).toUpperCase() || '?'

function MemberCluster({
  boardMembers,
  profiles,
  userId,
  onGoToTeam,
  invitePopoverOpen,
  onToggleInvitePopover,
  inviteEmail,
  onInviteEmailChange,
  sendingInvite,
  onSubmitInvite,
}) {
  const members = boardMembers ?? []

  if (members.length <= 1) {
    return (
      <>
        <div className="member-cluster member-cluster-solo">
          <span className="member-cluster-avatar" aria-hidden="true">
            {initialOf(profiles?.[userId])}
          </span>
          <span className="member-cluster-label">Just you</span>
          <button type="button" className="ghost-btn member-cluster-invite-btn" onClick={onToggleInvitePopover}>
            <PlusIcon size={12} /> Invite
          </button>
        </div>
        {invitePopoverOpen ? (
          <form className="member-invite-popover" onSubmit={onSubmitInvite}>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => onInviteEmailChange(e.target.value)}
              placeholder="teammate@studio.com"
              aria-label="Teammate email"
              autoFocus
            />
            <button type="submit" className="primary-btn" disabled={sendingInvite || !inviteEmail.trim()}>
              {sendingInvite ? 'Sending…' : 'Send'}
            </button>
          </form>
        ) : null}
      </>
    )
  }

  const shown = members.slice(0, 3)
  const extra = members.length - shown.length

  return (
    <button type="button" className="member-cluster member-cluster-multi" onClick={onGoToTeam}>
      <span className="member-cluster-stack">
        {shown.map((member, index) => (
          <span
            key={member.user_id}
            className="member-cluster-avatar"
            style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
            aria-hidden="true"
          >
            {initialOf(profiles?.[member.user_id])}
          </span>
        ))}
        {extra > 0 ? <span className="member-cluster-avatar member-cluster-extra" aria-hidden="true">+{extra}</span> : null}
      </span>
      <span className="member-cluster-label">{members.length} members</span>
    </button>
  )
}

export default function ProjectHeader({
  project,
  updateProjectField,
  methodologies,
  gameCategories,
  deleteProject,
  boardMembers,
  profiles,
  userId,
  onGoToTeam,
  invitePopoverOpen,
  onToggleInvitePopover,
  inviteEmail,
  onInviteEmailChange,
  sendingInvite,
  onSubmitInvite,
}) {
  if (!project) return null
  // Keep the project's own category selectable even if it was later removed
  // from the board's custom list, so the select never renders blank.
  const categoryOptions = project.category && !gameCategories.includes(project.category)
    ? [project.category, ...gameCategories]
    : gameCategories
  return (
    <section className="hero-panel panel">
      <div className="hero-copy">
        <div className="hero-copy-head">
          <p className="eyebrow">Project view</p>
          <div className="hero-member-cluster-wrap">
            <MemberCluster
              boardMembers={boardMembers}
              profiles={profiles}
              userId={userId}
              onGoToTeam={onGoToTeam}
              invitePopoverOpen={invitePopoverOpen}
              onToggleInvitePopover={onToggleInvitePopover}
              inviteEmail={inviteEmail}
              onInviteEmailChange={onInviteEmailChange}
              sendingInvite={sendingInvite}
              onSubmitInvite={onSubmitInvite}
            />
          </div>
        </div>
        <InlineText
          className="hero-title"
          value={project.name}
          onSave={(value) => updateProjectField('name', value)}
        />
        <InlineText
          className="hero-tagline"
          value={project.tagline}
          onSave={(value) => updateProjectField('tagline', value)}
        />
      </div>

      <div className="hero-metadata">
        <label>
          Category
          <select
            value={project.category}
            onChange={(e) => updateProjectField('category', e.target.value)}
          >
            {categoryOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Methodology
          <select
            value={project.methodology}
            onChange={(e) => updateProjectField('methodology', e.target.value)}
          >
            {methodologies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Target platform
          <input
            value={project.targetPlatform}
            onChange={(e) => updateProjectField('targetPlatform', e.target.value)}
          />
        </label>

        <label>
          Phase
          <input
            value={project.phase}
            onChange={(e) => updateProjectField('phase', e.target.value)}
          />
        </label>
        <button
          type="button"
          className="danger-btn project-delete-btn"
          onClick={() => deleteProject(project.id)}
        >
          Delete project
        </button>
      </div>
    </section>
  )
}