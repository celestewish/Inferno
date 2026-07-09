import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSearchIndex, searchIndex, filterQuickActions, RESULT_TYPES } from '../lib/search'
import {
  TasksIcon,
  ProjectsIcon,
  BookIcon,
  ForgeIcon,
  TeamIcon,
  FlameIcon,
  BellIcon,
  CommandIcon,
  SearchIcon,
  CloseIcon,
} from './Icons'

const TYPE_ICON = {
  [RESULT_TYPES.TASK]: TasksIcon,
  [RESULT_TYPES.PROJECT]: ProjectsIcon,
  [RESULT_TYPES.DOC]: BookIcon,
  [RESULT_TYPES.REPO]: ForgeIcon,
  [RESULT_TYPES.MESSAGE]: FlameIcon,
  [RESULT_TYPES.MEMBER]: TeamIcon,
  [RESULT_TYPES.NOTE]: BellIcon,
  [RESULT_TYPES.ACTION]: TasksIcon,
}

const TYPE_LABEL = {
  [RESULT_TYPES.TASK]: 'Task',
  [RESULT_TYPES.PROJECT]: 'Project',
  [RESULT_TYPES.DOC]: 'Doc',
  [RESULT_TYPES.REPO]: 'Repo',
  [RESULT_TYPES.MESSAGE]: 'Campfire',
  [RESULT_TYPES.MEMBER]: 'Member',
  [RESULT_TYPES.NOTE]: 'War Room',
  [RESULT_TYPES.ACTION]: 'Action item',
}

// Global search + command palette. Opened with Ctrl/Cmd+K (bound in App) or the
// sidebar search button. Searches loaded board data on the client and offers
// quick actions. No external dependency, no server round-trip.
export default function CommandPalette({
  open,
  onClose,
  data = {},
  onSelectSection,
  onOpenTask,
  onQuickAction,
}) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const index = useMemo(() => buildSearchIndex(data), [data])
  const results = useMemo(() => searchIndex(index, query), [index, query])
  const actions = useMemo(() => filterQuickActions(query), [query])

  // Flat, ordered list the keyboard cursor walks: quick actions first, then results.
  const rows = useMemo(
    () => [
      ...actions.map((a) => ({ kind: 'action', item: a })),
      ...results.map((r) => ({ kind: 'result', item: r })),
    ],
    [actions, results]
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Focus after the overlay paints so the caret lands in the input.
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const runRow = (row) => {
    if (!row) return
    if (row.kind === 'action') {
      onQuickAction?.(row.item.id)
      onClose?.()
      return
    }
    const entry = row.item
    if (entry.type === RESULT_TYPES.TASK && entry.taskId) {
      onSelectSection?.(entry.section)
      onOpenTask?.(entry.taskId)
    } else if ((entry.type === RESULT_TYPES.DOC || entry.type === RESULT_TYPES.REPO) && entry.url) {
      window.open(entry.url, '_blank', 'noopener,noreferrer')
    } else {
      onSelectSection?.(entry.section)
    }
    onClose?.()
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runRow(rows[activeIndex])
    }
  }

  return (
    <div
      className="cmdk-backdrop"
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Search and commands"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div className="cmdk-panel" onKeyDown={onKeyDown}>
        <div className="cmdk-search">
          <span className="cmdk-search-icon" aria-hidden="true"><SearchIcon size={17} /></span>
          <input
            ref={inputRef}
            type="text"
            className="cmdk-input"
            placeholder="Search tasks, docs, repos, people, or run a command"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            data-testid="command-palette-input"
            aria-label="Search"
          />
          <button type="button" className="cmdk-close" aria-label="Close" onClick={() => onClose?.()}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="cmdk-results">
          {actions.length ? (
            <div className="cmdk-group">
              <p className="cmdk-group-label"><CommandIcon size={13} /> Quick actions</p>
              <ul>
                {actions.map((action, i) => {
                  const rowIndex = i
                  return (
                    <li key={action.key}>
                      <button
                        type="button"
                        className={rowIndex === activeIndex ? 'cmdk-row is-active' : 'cmdk-row'}
                        onMouseEnter={() => setActiveIndex(rowIndex)}
                        onClick={() => runRow({ kind: 'action', item: action })}
                        data-testid="cmdk-action"
                      >
                        <span className="cmdk-row-icon" aria-hidden="true"><CommandIcon size={16} /></span>
                        <span className="cmdk-row-body">
                          <strong>{action.title}</strong>
                          <span>{action.hint}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {results.length ? (
            <div className="cmdk-group">
              <p className="cmdk-group-label"><SearchIcon size={13} /> Results</p>
              <ul>
                {results.map((entry, i) => {
                  const rowIndex = actions.length + i
                  const Icon = TYPE_ICON[entry.type] || SearchIcon
                  return (
                    <li key={entry.key}>
                      <button
                        type="button"
                        className={rowIndex === activeIndex ? 'cmdk-row is-active' : 'cmdk-row'}
                        onMouseEnter={() => setActiveIndex(rowIndex)}
                        onClick={() => runRow({ kind: 'result', item: entry })}
                        data-testid="cmdk-result"
                      >
                        <span className="cmdk-row-icon" aria-hidden="true"><Icon size={16} /></span>
                        <span className="cmdk-row-body">
                          <strong>{entry.title}</strong>
                          {entry.subtitle ? <span>{entry.subtitle}</span> : null}
                        </span>
                        <span className="cmdk-row-tag">{TYPE_LABEL[entry.type] || ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {query && !results.length ? (
            <p className="cmdk-empty" role="status">No matches for &quot;{query}&quot;.</p>
          ) : null}
        </div>

        <div className="cmdk-footer">
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Up</kbd> <kbd>Down</kbd> navigate</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
