import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  QUESTS,
  MAX_XP,
  XP_PER_LEVEL,
  DEFAULT_DEADLINE_SECONDS,
  getQuest,
  totalXp,
  levelForXp,
  xpIntoLevel,
  isUnlocked,
  isComplete,
  nextQuestId,
  allComplete,
  questProgress,
  stageStatus,
  formatCountdown,
} from '../lib/questGame'
import { cloneCommand } from '../lib/codeforge'
import InfernoLogo from './InfernoLogo'
import FlameHorse from './FlameHorse'
import {
  BoardIcon,
  BookIcon,
  FlameIcon,
  ForgeIcon,
  HeadsetIcon,
  TrophyIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ExternalLinkIcon,
} from './Icons'

const QUEST_ICONS = {
  board: BoardIcon,
  docs: BookIcon,
  campfire: FlameIcon,
  forge: ForgeIcon,
  warroom: HeadsetIcon,
  boss: TrophyIcon,
}

const OBJECTIVE_CHIPS = [
  'Forge amazing games',
  'Earn epic rewards',
  'Join a legendary crew',
  'Make your mark',
]

function QuestIcon({ iconKey, size = 22 }) {
  const Cmp = QUEST_ICONS[iconKey] || FlameIcon
  return <Cmp size={size} />
}

// --- Per-quest mini interactions -------------------------------------------
// Each interaction owns its own local state and calls onSolved() once the
// player satisfies the objective. They are intentionally tiny and teach one
// Inferno surface by doing rather than describing.

function BoardInteraction({ onSolved }) {
  const COLUMNS = ['To Do', 'In Progress', 'Done']
  const [cards, setCards] = useState([
    { id: 'c1', title: 'Sketch the core loop', col: 0 },
    { id: 'c2', title: 'Block out the tutorial', col: 0 },
    { id: 'c3', title: 'Pick the art palette', col: 0 },
  ])
  const advance = (id) => {
    setCards((current) => {
      const next = current.map((card) =>
        card.id === id ? { ...card, col: Math.min(card.col + 1, 2) } : card,
      )
      if (next.every((card) => card.col === 2)) onSolved()
      return next
    })
  }
  return (
    <div className="quest-mini quest-board-mini">
      <div className="quest-board-cols">
        {COLUMNS.map((label, colIndex) => (
          <div key={label} className="quest-board-col">
            <p className="quest-board-col-title">{label}</p>
            {cards
              .filter((card) => card.col === colIndex)
              .map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="quest-board-card"
                  onClick={() => advance(card.id)}
                  disabled={card.col === 2}
                >
                  <span>{card.title}</span>
                  {card.col < 2 ? <span className="quest-board-hint">Advance</span> : (
                    <span className="quest-board-done"><CheckIcon size={13} /></span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
      <p className="quest-mini-hint">Tap a task to push it toward Done.</p>
    </div>
  )
}

function DocsInteraction({ onSolved }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="quest-mini quest-docs-mini">
      <div className="quest-scroll">
        <p className="quest-scroll-title">Design note: The Ember Loop</p>
        {revealed ? (
          <p className="quest-scroll-body">
            Players stoke a dying flame by completing quests. Each win feeds the fire, the fire
            unlocks the next zone. Keep the loop tight: act, reward, advance.
          </p>
        ) : (
          <p className="quest-scroll-body is-sealed">The note is sealed. Inspect it to read the canon.</p>
        )}
      </div>
      <button
        type="button"
        className="quest-action-btn"
        onClick={() => {
          setRevealed(true)
          onSolved()
        }}
        disabled={revealed}
      >
        {revealed ? 'Note read' : 'Read the note'}
      </button>
    </div>
  )
}

function CampfireInteraction({ onSolved }) {
  const RALLIES = [
    'The jam is lit. Grab your tools, party.',
    'Two days to glory. Who is with me?',
    'Coffee loaded. Let us build something weird.',
  ]
  const [sent, setSent] = useState(null)
  return (
    <div className="quest-mini quest-campfire-mini">
      <div className="quest-chat">
        {sent ? (
          <div className="quest-chat-msg">
            <span className="quest-chat-author">You</span>
            <span className="quest-chat-body">{sent}</span>
          </div>
        ) : (
          <p className="quest-mini-hint">Pick a rallying cry to send around the fire.</p>
        )}
      </div>
      <div className="quest-chip-row">
        {RALLIES.map((line) => (
          <button
            key={line}
            type="button"
            className="quest-choice"
            onClick={() => {
              if (sent) return
              setSent(line)
              onSolved()
            }}
            disabled={Boolean(sent)}
          >
            {line}
          </button>
        ))}
      </div>
    </div>
  )
}

function ForgeInteraction({ onSolved }) {
  const REPO = 'https://github.com/celestewish/game-jam-quest'
  const [linked, setLinked] = useState(false)
  const [copied, setCopied] = useState(false)
  const command = cloneCommand(REPO)
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(command)
    } catch {
      // Clipboard may be unavailable in an insecure context; still count it.
    }
    setCopied(true)
    onSolved()
  }
  return (
    <div className="quest-mini quest-forge-mini">
      {linked ? (
        <div className="quest-repo-card">
          <span className="quest-repo-slug">celestewish/game-jam-quest</span>
          <div className="quest-clone-row">
            <code className="quest-clone-cmd">{command}</code>
            <button type="button" className="quest-copy-btn" onClick={copy} aria-label="Copy clone command">
              <CopyIcon size={14} />
            </button>
          </div>
          {copied ? <span className="quest-copied" role="status">Clone command copied</span> : null}
        </div>
      ) : (
        <button type="button" className="quest-action-btn" onClick={() => setLinked(true)}>
          Link the jam repo
        </button>
      )}
      {linked && !copied ? <p className="quest-mini-hint">Copy the clone command to finish.</p> : null}
    </div>
  )
}

function ChecklistInteraction({ items, onSolved }) {
  const [checked, setChecked] = useState(() => items.map(() => false))
  const toggle = (index) => {
    setChecked((current) => {
      const next = current.map((value, i) => (i === index ? true : value))
      if (next.every(Boolean)) onSolved()
      return next
    })
  }
  return (
    <div className="quest-mini quest-checklist-mini">
      <ul className="quest-checklist">
        {items.map((item, index) => (
          <li key={item}>
            <button
              type="button"
              className={`quest-check-item${checked[index] ? ' is-checked' : ''}`}
              onClick={() => toggle(index)}
              disabled={checked[index]}
            >
              <span className="quest-check-box">{checked[index] ? <CheckIcon size={13} /> : null}</span>
              <span>{item}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuestInteraction({ questId, onSolved }) {
  switch (questId) {
    case 'quest-board':
      return <BoardInteraction onSolved={onSolved} />
    case 'docs-shrine':
      return <DocsInteraction onSolved={onSolved} />
    case 'campfire':
      return <CampfireInteraction onSolved={onSolved} />
    case 'code-forge':
      return <ForgeInteraction onSolved={onSolved} />
    case 'war-room':
      return (
        <ChecklistInteraction
          onSolved={onSolved}
          items={['Share yesterday wins', 'Flag one blocker', 'Lock the polish list']}
        />
      )
    case 'deadline-boss':
      return (
        <ChecklistInteraction
          onSolved={onSolved}
          items={['Build passes green', 'Trailer clip recorded', 'Submit to the jam']}
        />
      )
    default:
      return null
  }
}

// --- Quest modal ------------------------------------------------------------

function QuestModal({ quest, alreadyDone, onClose, onComplete }) {
  const [solved, setSolved] = useState(alreadyDone)
  const dialogRef = useRef(null)
  const Icon = QUEST_ICONS[quest.icon] || FlameIcon

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="quest-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="quest-modal"
        role="dialog"
        aria-modal="true"
        aria-label={quest.node}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quest-modal-head">
          <span className="quest-modal-icon"><Icon size={20} /></span>
          <div>
            <p className="quest-modal-eyebrow">{quest.tagline}</p>
            <h2 className="quest-modal-title">{quest.node}</h2>
          </div>
          <button type="button" className="quest-icon-btn" aria-label="Close quest" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="quest-dante quest-dante--modal">
          <span className="quest-dante-avatar" aria-hidden="true"><FlameHorse size={40} /></span>
          <p className="quest-dante-line">{solved ? quest.danteOutro : quest.danteIntro}</p>
        </div>

        <p className="quest-modal-objective">
          <span className="quest-objective-label">Objective</span>
          {quest.objective}
        </p>

        <QuestInteraction questId={quest.id} onSolved={() => setSolved(true)} />

        <div className="quest-modal-foot">
          <span className={`quest-xp-tag${solved ? ' is-earned' : ''}`}>+{quest.xp} XP</span>
          <button
            type="button"
            className="quest-primary-btn"
            disabled={!solved}
            onClick={() => onComplete(quest.id)}
          >
            {solved ? (alreadyDone ? 'Close' : 'Claim reward') : 'Finish the objective'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Main landing -----------------------------------------------------------

export default function QuestLanding({ openLogin, openSignup }) {
  const [completed, setCompleted] = useState([])
  const [activeQuestId, setActiveQuestId] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DEADLINE_SECONDS)
  const [started, setStarted] = useState(false)
  const mapRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const xp = useMemo(() => totalXp(completed), [completed])
  const level = levelForXp(xp)
  const stages = useMemo(() => stageStatus(completed), [completed])
  const progress = questProgress(completed)
  const won = allComplete(completed)
  const nextId = nextQuestId(completed)
  const activeQuest = activeQuestId ? getQuest(activeQuestId) : null
  const activeObjective = won
    ? 'Jam complete. You beat the Deadline Boss.'
    : getQuest(nextId)?.objective || ''

  const openQuest = useCallback(
    (questId) => {
      if (!isUnlocked(questId, completed)) return
      setActiveQuestId(questId)
    },
    [completed],
  )

  const completeQuest = useCallback((questId) => {
    setCompleted((current) => (current.includes(questId) ? current : [...current, questId]))
    setActiveQuestId(null)
  }, [])

  const startJam = () => {
    setStarted(true)
    if (!activeQuestId && nextId) setActiveQuestId(nextId)
  }

  return (
    <div className="quest-page">
      <header className="quest-nav">
        <a className="quest-brand" href="#top" aria-label="Inferno home">
          <InfernoLogo size={30} />
          <span className="quest-brand-word">Inferno</span>
        </a>
        <div className="quest-nav-actions">
          <button type="button" className="quest-ghost-btn" onClick={openLogin}>
            Log in
          </button>
          <button type="button" className="quest-primary-btn quest-nav-cta" onClick={openSignup}>
            Sign up
          </button>
        </div>
      </header>

      {/* HUD */}
      <div className="quest-hud" data-testid="quest-hud">
        <div className="quest-hud-stages" aria-label="Jam progress">
          {stages.map((stage) => (
            <div key={stage.id} className={`quest-stage is-${stage.status}`}>
              <span className="quest-stage-dot" aria-hidden="true" />
              <span className="quest-stage-label">{stage.label}</span>
            </div>
          ))}
        </div>
        <div className="quest-hud-meters">
          <div className="quest-hud-xp">
            <div className="quest-hud-xp-top">
              <span className="quest-hud-key">XP</span>
              <span className="quest-hud-val">
                {xp} / {MAX_XP}
              </span>
              <span className="quest-hud-lvl">LVL {level}</span>
            </div>
            <div className="quest-xp-bar" role="progressbar" aria-valuenow={xpIntoLevel(xp)} aria-valuemin={0} aria-valuemax={XP_PER_LEVEL}>
              <span style={{ width: `${(xpIntoLevel(xp) / XP_PER_LEVEL) * 100}%` }} />
            </div>
          </div>
          <div className="quest-hud-timer" aria-label="Jam deadline">
            <span className="quest-hud-key">Deadline</span>
            <span className="quest-hud-clock" data-testid="quest-clock">{formatCountdown(secondsLeft)}</span>
          </div>
        </div>
        <div className="quest-hud-objective" data-testid="quest-objective">
          <span className="quest-hud-key">Objective</span>
          <span className="quest-hud-obj-text">{activeObjective}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="quest-hero" id="top">
        <div className="quest-hero-copy">
          <p className="quest-eyebrow">Dante's Indie Game Jam Studio</p>
          <h1 className="quest-title">Inferno: Game Jam Quest</h1>
          <p className="quest-subtitle">
            Step into the studio and learn Inferno the fun way. Play a short RPG onboarding quest,
            beat the deadline boss, and see how a real game team plans, builds, and ships.
          </p>

          <div className="quest-dante">
            <span className="quest-dante-avatar" aria-hidden="true"><FlameHorse size={52} /></span>
            <div>
              <p className="quest-dante-name">Dante, your guide</p>
              <p className="quest-dante-line">
                {won
                  ? 'You did it. The jam is beaten and the studio is yours. Sign up to run your own.'
                  : started
                    ? 'Nice. Follow the glowing node and keep the fire alive.'
                    : 'Welcome to the studio. Hit Start the Jam and I will walk you through it.'}
              </p>
            </div>
          </div>

          <div className="quest-cta-row">
            <button type="button" className="quest-primary-btn quest-start-btn" onClick={startJam}>
              {won ? 'Replay the jam' : started ? 'Continue the jam' : 'Start the Jam'}
            </button>
            <button type="button" className="quest-ghost-btn" onClick={openLogin}>
              Enter Dashboard
            </button>
          </div>

          <ul className="quest-chips" aria-label="What you will do">
            {OBJECTIVE_CHIPS.map((chip) => (
              <li key={chip} className="quest-chip">{chip}</li>
            ))}
          </ul>
        </div>

        {/* Quest map */}
        <div className="quest-map" ref={mapRef} data-testid="quest-map">
          <div className="quest-map-head">
            <span className="quest-map-title">Quest Map</span>
            <span className="quest-map-count">
              {completed.length} / {QUESTS.length} cleared
            </span>
          </div>
          <div className="quest-map-track" aria-hidden="true">
            <span className="quest-map-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <ul className="quest-nodes">
            {QUESTS.map((quest, index) => {
              const unlocked = isUnlocked(quest.id, completed)
              const done = isComplete(quest.id, completed)
              const isNext = quest.id === nextId
              const state = done ? 'done' : unlocked ? (isNext ? 'active' : 'open') : 'locked'
              return (
                <li key={quest.id}>
                  <button
                    type="button"
                    className={`quest-node is-${state}`}
                    onClick={() => openQuest(quest.id)}
                    disabled={!unlocked}
                    aria-label={`${quest.node}. ${done ? 'Complete' : unlocked ? 'Available' : 'Locked'}`}
                    data-testid={`quest-node-${quest.id}`}
                  >
                    <span className="quest-node-index">{index + 1}</span>
                    <span className="quest-node-icon"><QuestIcon iconKey={quest.icon} /></span>
                    <span className="quest-node-body">
                      <span className="quest-node-name">{quest.node}</span>
                      <span className="quest-node-tag">{quest.tagline}</span>
                    </span>
                    <span className="quest-node-state">
                      {done ? <CheckIcon size={15} /> : unlocked ? `+${quest.xp}` : 'Locked'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {won ? (
            <div className="quest-win" role="status" data-testid="quest-win">
              <span className="quest-win-badge"><TrophyIcon size={26} /></span>
              <p className="quest-win-title">Jam beaten. Level {level} reached.</p>
              <p className="quest-win-copy">
                You planned, built, and shipped a game with Inferno. Bring your own crew and do it for real.
              </p>
              <div className="quest-cta-row">
                <button type="button" className="quest-primary-btn" onClick={openSignup}>
                  Create your studio
                </button>
                <button type="button" className="quest-ghost-btn" onClick={openLogin}>
                  Enter Dashboard
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <footer className="quest-footer">
        <span>Inferno</span>
        <span className="quest-footer-muted">Plan, build, and ship games with your crew.</span>
        <a className="quest-footer-link" href="#top" onClick={openSignup}>
          <span>Start for free</span>
          <ExternalLinkIcon size={13} />
        </a>
      </footer>

      {activeQuest ? (
        <QuestModal
          quest={activeQuest}
          alreadyDone={isComplete(activeQuest.id, completed)}
          onClose={() => setActiveQuestId(null)}
          onComplete={completeQuest}
        />
      ) : null}
    </div>
  )
}
