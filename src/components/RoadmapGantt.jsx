import FlameHorse from './FlameHorse'

const QUARTERS = ['Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027']

// start is a 1-based quarter index into QUARTERS, span is quarter count.
const PHASES = [
  {
    id: 'mobile',
    tag: 'Next',
    title: 'Mobile app-style experience',
    body: 'A touch-first layout with a bottom nav for planning on the go.',
    start: 1,
    span: 2,
    lane: 'ember',
  },
  {
    id: 'templates',
    tag: 'Planned',
    title: 'Board templates',
    body: 'Ready-made pipelines for jams, prototypes, and full productions.',
    start: 2,
    span: 2,
    lane: 'violet',
  },
  {
    id: 'attachments',
    tag: 'Planned',
    title: 'Task attachments',
    body: 'Pin references, art, and docs to the cards they belong to.',
    start: 3,
    span: 1,
    lane: 'cyan',
  },
  {
    id: 'integrations',
    tag: 'Exploring',
    title: 'Integrations',
    body: 'Connect the chat and source tools your studio already lives in.',
    start: 3,
    span: 2,
    lane: 'violet',
  },
  {
    id: 'exports',
    tag: 'Exploring',
    title: 'Exports',
    body: 'Share boards and reports with stakeholders and publishers.',
    start: 4,
    span: 1,
    lane: 'ember',
  },
]

export default function RoadmapGantt() {
  const columns = QUARTERS.length

  return (
    <div className="gantt" data-testid="roadmap-gantt">
      <div className="gantt-scroll">
        <div className="gantt-inner" style={{ '--gantt-cols': columns }}>
          <div className="gantt-head" role="row" aria-hidden="true">
            <span className="gantt-lane-label gantt-head-label">
              <span className="gantt-runner">
                <FlameHorse size={34} title="Blaze racing the roadmap" />
              </span>
              Quest lanes
            </span>
            <div className="gantt-track gantt-head-track">
              {QUARTERS.map((quarter) => (
                <span key={quarter} className="gantt-quarter">{quarter}</span>
              ))}
            </div>
          </div>

          <ul className="gantt-lanes">
            {PHASES.map((phase) => (
              <li key={phase.id} className="gantt-lane" role="row">
                <div className="gantt-lane-label">
                  <span className={`gantt-tag gantt-tag--${phase.tag.toLowerCase()}`}>{phase.tag}</span>
                  <span className="gantt-lane-title">{phase.title}</span>
                  <span className="gantt-lane-body">{phase.body}</span>
                </div>
                <div className="gantt-track">
                  {QUARTERS.map((quarter, index) => (
                    <span key={quarter} className={index === 0 ? 'gantt-gridline is-first' : 'gantt-gridline'} aria-hidden="true" />
                  ))}
                  <span
                    className={`gantt-bar gantt-bar--${phase.lane}`}
                    style={{ gridColumn: `${phase.start} / span ${phase.span}` }}
                  >
                    <span className="gantt-bar-spark" aria-hidden="true" />
                    <span className="gantt-bar-label">
                      {QUARTERS[phase.start - 1]}
                      {phase.span > 1 ? ` to ${QUARTERS[phase.start + phase.span - 2]}` : ''}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="gantt-caption muted-copy">
        Blaze gallops the track as each phase ships. Timeline is a forward-looking plan, not a promise.
      </p>
    </div>
  )
}
