import { useEffect, useState } from 'react'

const SLIDES = [
  { src: '/marketing/board.webp', label: 'Kanban board', alt: 'Inferno Kanban board with backlog, to do, in progress, and review columns beside the project sidebar' },
  { src: '/marketing/tasks.webp', label: 'Task details', alt: 'An Inferno task card showing assignee, discipline, priority, estimate, and due date' },
  { src: '/marketing/projects.webp', label: 'Projects', alt: 'Inferno project view with category, methodology, target platform, and phase controls' },
  { src: '/marketing/calendar.webp', label: 'Calendar', alt: 'Inferno month calendar with task due dates laid across the weeks' },
  { src: '/marketing/reports.webp', label: 'Reports', alt: 'Inferno reports dashboard with totals by status, priority, and discipline' },
  { src: '/marketing/team.webp', label: 'Team', alt: 'Inferno team panel with an assignable roster and member roles' },
  { src: '/marketing/customization.webp', label: 'Customization', alt: 'Inferno appearance editor with accent, glow, surface, and background color swatches' },
  { src: '/marketing/mobile.webp', label: 'Mobile', alt: 'Inferno reports screen on a phone with a bottom navigation bar' },
]

const INTERVAL = 4500

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = (event) => setReducedMotion(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (paused || reducedMotion) return undefined
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length)
    }, INTERVAL)
    return () => window.clearInterval(timer)
  }, [paused, reducedMotion])

  const go = (next) => setIndex((next + SLIDES.length) % SLIDES.length)

  const active = SLIDES[index]

  return (
    <div
      className="hero-carousel"
      data-testid="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Inferno product tour"
    >
      <div className="hero-carousel-glow" aria-hidden="true" />

      <div className="hero-carousel-frame">
        {SLIDES.map((slide, slideIndex) => (
          <img
            key={slide.src}
            className={slideIndex === index ? 'landing-shot hero-carousel-slide is-active' : 'landing-shot hero-carousel-slide'}
            src={slide.src}
            width={1280}
            height={720}
            alt={slide.alt}
            aria-hidden={slideIndex === index ? undefined : true}
            loading={slideIndex === 0 ? 'eager' : 'lazy'}
          />
        ))}

        <button
          type="button"
          className="hero-carousel-arrow hero-carousel-arrow--prev"
          onClick={() => go(index - 1)}
          aria-label="Previous screenshot"
          data-testid="hero-carousel-prev"
        >
          <span aria-hidden="true">&#8249;</span>
        </button>
        <button
          type="button"
          className="hero-carousel-arrow hero-carousel-arrow--next"
          onClick={() => go(index + 1)}
          aria-label="Next screenshot"
          data-testid="hero-carousel-next"
        >
          <span aria-hidden="true">&#8250;</span>
        </button>

        <p className="hero-carousel-caption" aria-live="polite" data-testid="hero-carousel-caption">
          {active.label}
          <span className="hero-carousel-caption-count"> {index + 1} of {SLIDES.length}</span>
        </p>
      </div>

      <div className="hero-carousel-dots" role="tablist" aria-label="Choose a screenshot">
        {SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.src}
            type="button"
            role="tab"
            aria-selected={slideIndex === index}
            aria-label={slide.label}
            className={slideIndex === index ? 'hero-carousel-dot is-active' : 'hero-carousel-dot'}
            onClick={() => go(slideIndex)}
          >
            <span aria-hidden="true">{slide.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
