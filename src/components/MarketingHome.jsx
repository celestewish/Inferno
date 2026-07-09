import { useState } from 'react'
import InfernoLogo from './InfernoLogo'
import FeatureIcon from './FeatureIcon'
import HeroCarousel from './HeroCarousel'
import GuidedTour from './GuidedTour'
import RoadmapGantt from './RoadmapGantt'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#sandbox', label: 'Try it' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#story', label: 'Story' },
  { href: '#roadmap', label: 'Roadmap' },
]

const FEATURES = [
  {
    icon: 'boards',
    title: 'Boards',
    body: 'A shared studio workspace per game or team, with chat and invites built in.',
  },
  {
    icon: 'projects',
    title: 'Projects',
    body: 'Group work by feature area, milestone, or whole game, then switch in a click.',
  },
  {
    icon: 'kanban',
    title: 'Kanban sections',
    body: 'Backlog, To Do, In Progress, Review, and Done. Customize the pipeline to fit.',
  },
  {
    icon: 'tasks',
    title: 'Tasks',
    body: 'Assignees, discipline, priority, estimates, due dates, and notes on every card.',
  },
  {
    icon: 'calendar',
    title: 'Calendar',
    body: 'See due dates across the board on a month view so nothing slips through.',
  },
  {
    icon: 'reports',
    title: 'Reports',
    body: 'Live snapshots by status, priority, and discipline to track production health.',
  },
  {
    icon: 'team',
    title: 'Team',
    body: 'Invite collaborators, assign work, and talk it through in real-time board chat.',
  },
  {
    icon: 'customization',
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
    points: ['Email invites with access levels', 'Per-board assignable roster', 'Live board chat and presence'],
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
    points: ['Editable Kanban sections', 'Category and methodology per project', 'Live accent, glow, and surface theming'],
    image: '/marketing/customization.webp',
    width: 661,
    height: 388,
    alt: 'Inferno appearance editor with accent, glow, surface, and background color swatches',
  },
  {
    id: 'deep-insights',
    eyebrow: 'Calendar and reports',
    title: 'Know where production really stands',
    body: 'A month calendar surfaces every due date, while reports roll up totals by status, priority, and discipline across the whole board, so producers can spot bottlenecks before they become blockers.',
    points: ['Month calendar of due dates', 'Totals by status and priority', 'Breakdown by discipline'],
    image: '/marketing/reports.webp',
    width: 1100,
    height: 621,
    alt: 'Inferno reports dashboard with task totals and breakdowns by status, priority, and discipline',
  },
  {
    id: 'deep-permissions',
    eyebrow: 'Board-specific permissions',
    title: 'Give people exactly the access they need',
    body: 'Each board has its own members and roles. Assign viewer, editor, or owner access, transfer ownership, and remove members. Permissions stay scoped to the board so studios can run several at once.',
    points: ['Per-board member roles', 'Owner transfer and removal', 'Scoped, separate boards'],
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

export default function MarketingHome({ openLogin, openSignup }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleNavClick = (event, href) => {
    const target = document.querySelector(href)
    if (target) {
      event.preventDefault()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', href)
    }
    closeMenu()
  }

  return (
    <div className="landing">
      <header className="landing-nav" data-testid="landing-nav">
        <a className="landing-brand" href="#top" onClick={(event) => handleNavClick(event, '#top')}>
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
            <a key={link.href} href={link.href} onClick={(event) => handleNavClick(event, link.href)}>
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
              assign work, and drive production from first prototype to final polish, all on one dark,
              focused board that thinks in disciplines instead of spreadsheets.
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
            <HeroCarousel />
          </div>
        </section>

        <div className="landing-divider landing-divider--warm" aria-hidden="true" />

        <section className="landing-section" id="features" aria-label="Features">
          <div className="landing-section-head">
            <p className="eyebrow">Everything in one board</p>
            <h2>Tools made for making games</h2>
            <p className="muted-copy">
              Inferno unifies planning, tasks, scheduling, and team coordination around a simple
              Board, Project, Task model your whole studio can follow.
            </p>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon">
                  <FeatureIcon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="landing-divider landing-divider--cool" aria-hidden="true" />

        <section className="landing-section landing-sandbox" id="sandbox" aria-label="Interactive tutorial">
          <div className="landing-section-head">
            <p className="eyebrow">Try it, no signup</p>
            <h2>Run a game jam in eight steps</h2>
            <p className="muted-copy">
              Blaze the flame pony walks you through the whole Inferno loop, from naming a board to
              shipping a milestone. Complete each quest step on a live mini board. It runs entirely
              in your browser and nothing is saved.
            </p>
          </div>

          <GuidedTour />
        </section>

        <div className="landing-divider landing-divider--ember" aria-hidden="true" />

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

        <div className="landing-divider landing-divider--cool" aria-hidden="true" />

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

        <div className="landing-divider landing-divider--warm" aria-hidden="true" />

        <section className="landing-section landing-story" id="story" aria-label="Why Inferno exists">
          <div className="landing-story-copy">
            <p className="eyebrow">Why Inferno exists</p>
            <h2>Made for how games actually get built</h2>
            <p className="muted-copy">
              Most task tools are built for generic software teams. Small studios end up juggling
              planning docs, chat apps, and spreadsheets until context scatters and momentum stalls.
            </p>
            <p className="muted-copy">
              Inferno is opinionated about game development. Disciplines like design, art, audio, and
              polish are first-class, tasks carry the estimates and sprint context producers care
              about, and the whole board reads like a pipeline instead of a spreadsheet. It stays free
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

        <div className="landing-divider landing-divider--ember" aria-hidden="true" />

        <section className="landing-section" id="roadmap" aria-label="Roadmap">
          <div className="landing-section-head">
            <p className="eyebrow">Roadmap</p>
            <h2>What is coming next</h2>
            <p className="muted-copy">Inferno is actively evolving. Here is the track ahead.</p>
          </div>

          <RoadmapGantt />
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
