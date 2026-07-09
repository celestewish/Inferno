import { useMemo, useState } from 'react'

const COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'building', label: 'In Progress' },
  { id: 'shipped', label: 'Shipped' },
]

const DISCIPLINES = ['Design', 'Art', 'Code', 'Audio', 'Polish']

const SEED = [
  { id: 's1', title: 'Blockout the tutorial cavern', discipline: 'Design', status: 'backlog' },
  { id: 's2', title: 'Rig the boss enemy', discipline: 'Art', status: 'backlog' },
  { id: 's3', title: 'Wire up double-jump input', discipline: 'Code', status: 'building' },
  { id: 's4', title: 'Compose the hub theme', discipline: 'Audio', status: 'building' },
  { id: 's5', title: 'Ship the title screen', discipline: 'Polish', status: 'shipped' },
]

let nextId = 100

export default function SandboxDemo() {
  const [cards, setCards] = useState(SEED)
  const [draft, setDraft] = useState('')
  const [discipline, setDiscipline] = useState('Design')

  const grouped = useMemo(() => {
    const map = { backlog: [], building: [], shipped: [] }
    for (const card of cards) map[card.status]?.push(card)
    return map
  }, [cards])

  const advance = (card) => {
    const order = COLUMNS.map((column) => column.id)
    const currentIndex = order.indexOf(card.status)
    const nextStatus = order[(currentIndex + 1) % order.length]
    setCards((current) =>
      current.map((item) => (item.id === card.id ? { ...item, status: nextStatus } : item)),
    )
  }

  const addCard = (event) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    setCards((current) => [
      ...current,
      { id: `u${(nextId += 1)}`, title, discipline, status: 'backlog' },
    ])
    setDraft('')
  }

  const reset = () => {
    setCards(SEED)
    setDraft('')
    setDiscipline('Design')
  }

  return (
    <div className="sandbox" data-testid="sandbox-demo">
      <form className="sandbox-add" onSubmit={addCard}>
        <input
          className="sandbox-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task, e.g. Bake lighting for level 2"
          aria-label="New sandbox task title"
          maxLength={80}
          data-testid="sandbox-input"
        />
        <select
          className="sandbox-select"
          value={discipline}
          onChange={(event) => setDiscipline(event.target.value)}
          aria-label="Task discipline"
        >
          {DISCIPLINES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button type="submit" className="primary-btn sandbox-add-btn" data-testid="sandbox-add">
          Add task
        </button>
        <button type="button" className="secondary-btn sandbox-reset" onClick={reset} data-testid="sandbox-reset">
          Reset
        </button>
      </form>

      <div className="sandbox-board">
        {COLUMNS.map((column) => (
          <section
            key={column.id}
            className={`sandbox-column sandbox-column--${column.id}`}
            aria-label={`${column.label} column`}
          >
            <header className="sandbox-column-head">
              <h4>{column.label}</h4>
              <span className="sandbox-count">{grouped[column.id].length}</span>
            </header>

            <ul className="sandbox-cards">
              {grouped[column.id].length === 0 ? (
                <li className="sandbox-empty">Drop work here</li>
              ) : (
                grouped[column.id].map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      className="sandbox-card"
                      onClick={() => advance(card)}
                      title={
                        card.status === 'shipped'
                          ? 'Send back to Backlog'
                          : 'Move to next column'
                      }
                    >
                      <span className={`sandbox-tag sandbox-tag--${card.discipline.toLowerCase()}`}>
                        {card.discipline}
                      </span>
                      <span className="sandbox-card-title">{card.title}</span>
                      <span className="sandbox-card-move" aria-hidden="true">
                        {card.status === 'shipped' ? '↺' : '→'}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>

      <p className="sandbox-hint muted-copy">
        Tap any card to move it down the pipeline. Nothing here is saved, so experiment freely.
      </p>
    </div>
  )
}
