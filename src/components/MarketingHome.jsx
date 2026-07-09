import { useState } from 'react'
import InfernoLogo from './InfernoLogo'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#story', label: 'Story' },
  { href: '#roadmap', label: 'Roadmap' },
]

const FEATURES = [
  {
    icon: '🗂️',
    title: 'Boards',
    body: 'A shared studio workspace per game or team, with chat and invites built in.',
  },
  {
    icon: '🎮',
    title: 'Projects',
    body: 'Group work by feature area, milestone, or whole game — and switch in a click.',
  },
  {
    icon: '📋',
    title: 'Kanban sections',
    body: 'Backlog, To Do, In Progress, Review, and Done — customize the pipeline to fit.',
  },
  {
    icon: '✅',
    title: 'Tasks',
    body: 'Assignees, discipline, priority, estimates, due dates, and notes on every card.',
  },
  {
    icon: '📅',
    title: 'Calendar',
    body: 'See due dates across the board on a month view so nothing slips through.',
  },
  {
    icon: '📊',
    title: 'Reports',
    body: 'Live snapshots by status, priority, and discipline to track production health.',
  },
  {
    icon: '🤝',
    title: 'Team',
    body: 'Invite collaborators, assign work, and talk it through in real-time board chat.',
  },
  {
    icon: '🎨',
    title: 'Customization',
    body: 'Recolor accent, glow, surface, and background to make each board your own.',
  },
]

const DEEP_DIVES = [
  {
    id: 'deep-collaboration',
    eyebrow: 'Collaboration',
    title: 'Keep the whole team on the same pipeline',
    body: 'Invite teammates by email, assign tasks to a per-board roster, and discuss decisions in real-time chat that lives right next to the work. Presence shows who is on the board so nothing gets duplicated.',
    points: ['Email invites with access levels', 'Per-board assignable roster', 'Live board chat + presence'],
    image: '/marketing/team.webp',
    width: 1100,
    height: 647,
    alt: 'Inferno team collaboration view showing an assignable roster and member roles',
  },
  {
    id: 'deep-workflow',
    eyebrow: 'Custom workflow',
    title: 'Shape the board around how you actually ship',
    body: 'Rename and reorder Kanban sections, tune project category and methodology, and restyle the board with a live color editor. Inferno bends to your process instead of forcing a generic one.',
    points: ['Editable Kanban sections', 'Category + methodology per project', 'Live accent / glow / surface theming'],
    image: '/marketing/customization.webp',
    width: 661,
    height: 388,
    alt: 'Inferno appearance editor with accent, glow, surface, and background color swatches',
  },
  {
    id: 'deep-insights',
    eyebrow: 'Calendar & reports',
    title: 'Know where production really stands',
    body: 'A month calendar surfaces every due date, while reports roll up totals by status, priority, and discipline across the whole board — so producers can spot bottlenecks before they become blockers.',
    points: ['Month calendar of due dates', 'Totals by status & priority', 'Breakdown by discipline'],
    image: '/marketing/reports.webp',
    width: 1100,
    height: 621,
    alt: 'Inferno reports dashboard with task totals and breakdowns by status, priority, and discipline',
  },
  {
    id: 'deep-permissions',
    eyebrow: 'Board-specific permissions',
    title: 'Give people exactly the access they need',
    body: 'Each board has its own members and roles. Assign viewer, editor, or owner access, transfer ownership, and remove members — permissions stay scoped to the board so studios can run several at once.',
    points: ['Per-board member roles', 'Owner transfer & removal', 'Scoped, separate boards'],
    image: '/marketing/projects.webp',
    width: 1100,
    height: 666,
    alt: 'Inferno project view with category, methodology, target platform, and phase controls',
  },
]

const STEPS = [
  {
    badge: '1',
    title: 'Create a board',
    body: 'Spin up a workspace for your game or studio. New accounts start with a fully seeded sample board so you can explore right away.',
  },
  {
    badge: '2',
    title: 'Plan the work',
    body: 'Add projects, break them into tasks, and drag cards across your Kanban pipeline from backlog to done.',
  },
  {
    badge: '3',
    title: 'Ship together',
    body: 'Invite the team, assign work, track due dates on the calendar, and watch progress in live reports.',
  },
]

const ROADMAP = [
  { tag: 'Next', title: 'Mobile app-style experience', body: 'A dedicated touch-first layout with a bottom nav for planning on the go.' },
  { tag: 'Planned', title: 'Board templates', body: 'Start from ready-made pipelines for jams, prototypes, and full productions.' },
  { tag: 'Planned', title: 'Task attachments', body: 'Attach references, art, and docs directly to the cards they belong to.' },
  { tag: 'Exploring', title: 'Integrations', body: 'Connect the tools your studio already lives in, from chat to source control.' },
  { tag: 'Exploring', title: 'Exports', body: 'Export boards and reports to share progress with stakeholders and publishers.' },
]

export default function MarketingHome({ openLogin, openSignup }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="landing">
      <header className="landing-nav" data-testid="landing-nav">
        <a className="landing-brand" href="#top" onClick={closeMenu}>
          <InfernoLogo size={30} />
          <span className="landing-brand-name">Inferno</span>
        </a>

        <button
          type="button"
          className="landing-nav-toggle"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className={menuOpen ? 'landing-nav-links is-open' : 'landing-nav-links'} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
          <button
            type="button"
            className="secondary-btn landing-nav-login"
            data-testid="nav-login"
            onClick={() => { closeMenu(); openLogin() }}
          >
            Log in
          </button>
          <button
            type="button"
            className="primary-btn landing-nav-signup"
            data-testid="nav-signup"
            onClick={() => { closeMenu(); openSignup() }}
          >
            Sign up free
          </button>
        </nav>
      </header>

      <main className="landing-main" id="top">
        <section className="landing-hero" aria-label="Inferno overview">
          <div className="landing-hero-copy">
            <p className="eyebrow">Game production, organized</p>
            <h1 className="inferno-wordmark landing-hero-title">Inferno</h1>
            <p className="landing-hero-pitch">
              The free task board built for indie game developers and small studios. Plan features,
              assign work, and track production from backlog to final polish — all on one dark,
              focused board.
            </p>

            <div className="landing-cta-row">
              <button type="button" className="primary-btn" data-testid="hero-signup" onClick={openSignup}>
                Sign up free
              </button>
              <button type="button" className="secondary-btn" data-testid="hero-login" onClick={openLogin}>
                Log in
              </button>
            </div>

            <ul className="landing-proof" aria-label="Highlights">
              <li>Free to use</li>
              <li>Built for game projects</li>
              <li>Starts with a seeded sample board</li>
            </ul>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-glow" aria-hidden="true" />
            <img
              className="landing-shot"
              src="/marketing/board.webp"
              width={1280}
              height={582}
              alt="Inferno Kanban board with backlog, to do, in progress, and review columns alongside the project sidebar"
              fetchPriority="high"
            />
          </div>
        </section>

        <section className="landing-section" id="features" aria-label="Features">
          <div className="landing-section-head">
            <p className="eyebrow">Everything in one board</p>
            <h2>Features made for making games</h2>
            <p className="muted-copy">
              Inferno unifies planning, tasks, scheduling, and team coordination around a simple
              Board → Project → Task model.
            </p>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-deep" aria-label="Feature details">
          {DEEP_DIVES.map((dive, index) => (
            <article
              key={dive.id}
              id={dive.id}
              className={index % 2 === 1 ? 'landing-deep-row is-reversed' : 'landing-deep-row'}
            >
              <div className="landing-deep-copy">
                <p className="eyebrow">{dive.eyebrow}</p>
                <h3>{dive.title}</h3>
                <p className="muted-copy">{dive.body}</p>
                <ul className="landing-check-list">
                  {dive.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <div className="landing-deep-visual">
                <img
                  className="landing-shot"
                  src={dive.image}
                  width={dive.width}
                  height={dive.height}
                  alt={dive.alt}
                  loading="lazy"
                />
              </div>
            </article>
          ))}
        </section>

        <section className="landing-section" id="how-it-works" aria-label="How it works">
          <div className="landing-section-head">
            <p className="eyebrow">How it works</p>
            <h2>From empty board to shipped build</h2>
            <p className="muted-copy">Three steps to get your production moving.</p>
          </div>

          <ol className="landing-steps">
            {STEPS.map((step) => (
              <li key={step.badge} className="landing-step">
                <span className="landing-step-badge" aria-hidden="true">{step.badge}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-story" id="story" aria-label="Why Inferno exists">
          <div className="landing-story-copy">
            <p className="eyebrow">Why Inferno exists</p>
            <h2>Made for how games actually get built</h2>
            <p className="muted-copy">
              Most task tools are built for generic software teams. Small studios end up juggling
              planning docs, chat apps, and spreadsheets until context scatters and momentum stalls.
            </p>
            <p className="muted-copy">
              Inferno is opinionated about game development: disciplines like design, art, audio, and
              polish are first-class, tasks carry the estimates and sprint context producers care
              about, and the whole board reads like a pipeline instead of a spreadsheet. It's free
              because indie teams and student projects deserve production tooling that fits them.
            </p>
          </div>
          <figure className="landing-story-visual">
            <img
              className="landing-shot landing-shot--mobile"
              src="/marketing/mobile.webp"
              width={540}
              height={962}
              alt="Inferno reports screen on a phone with a bottom navigation bar"
              loading="lazy"
            />
          </figure>
        </section>

        <section className="landing-section" id="roadmap" aria-label="Roadmap">
          <div className="landing-section-head">
            <p className="eyebrow">Roadmap</p>
            <h2>What's coming next</h2>
            <p className="muted-copy">Inferno is actively evolving. Here's where it's headed.</p>
          </div>

          <div className="landing-roadmap-grid">
            {ROADMAP.map((item) => (
              <article key={item.title} className="landing-roadmap-card">
                <span className="landing-roadmap-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-final-cta" aria-label="Get started">
          <h2>Start planning your game today</h2>
          <p className="muted-copy">
            Create a free account and explore a fully seeded sample board in seconds.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="primary-btn" data-testid="final-signup" onClick={openSignup}>
              Sign up free
            </button>
            <button type="button" className="secondary-btn" data-testid="final-login" onClick={openLogin}>
              Log in
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <InfernoLogo size={24} />
          <span>Inferno</span>
        </div>
        <p className="muted-copy">A free game production task board for indie developers and small teams.</p>
      </footer>
    </div>
  )
}
