import { useEffect, useMemo, useRef, useState } from 'react'
import {
  formatDueLabel,
  formatMonthLabel,
  parseDueDate,
  startOfToday,
  toISODate,
} from '../lib/dates.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Compact popover month picker for selecting a task due date. Emits canonical
// ISO local date strings (YYYY-MM-DD) via onChange, and clears via onClear.
export default function DatePicker({
  value,
  onChange,
  onClear,
  placeholder = 'Set due date',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  // 'days' shows the month grid; 'years' shows a year grid so far-future (or
  // past) due dates are reachable without clicking the month arrow dozens of
  // times.
  const [view, setView] = useState('days')
  const rootRef = useRef(null)

  const selectedDate = useMemo(() => parseDueDate(value), [value])
  const selectedKey = selectedDate ? toISODate(selectedDate) : null
  const todayKey = toISODate(startOfToday())

  const [monthCursor, setMonthCursor] = useState(
    () => selectedDate ?? startOfToday()
  )

  // Re-centre the grid on the selected month whenever the picker opens, and
  // always reopen on the day view.
  useEffect(() => {
    if (open) {
      setMonthCursor(selectedDate ?? startOfToday())
      setView('days')
    }
  }, [open, selectedDate])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const list = []
    for (let i = 0; i < firstWeekday; i += 1) list.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      list.push({ day, key: toISODate(date) })
    }
    return list
  }, [monthCursor])

  const goToMonth = (delta) =>
    setMonthCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1)
    )

  // The 12-year block currently shown in the year view.
  const YEAR_BLOCK = 12
  const [yearRangeStart, setYearRangeStart] = useState(
    () => monthCursor.getFullYear() - (monthCursor.getFullYear() % YEAR_BLOCK)
  )

  const openYearView = () => {
    const year = monthCursor.getFullYear()
    setYearRangeStart(year - (year % YEAR_BLOCK))
    setView('years')
  }

  const years = useMemo(
    () => Array.from({ length: YEAR_BLOCK }, (_, i) => yearRangeStart + i),
    [yearRangeStart]
  )

  const selectYear = (year) => {
    setMonthCursor((current) => new Date(year, current.getMonth(), 1))
    setView('days')
  }

  const selectDay = (key) => {
    onChange(key)
    setOpen(false)
  }

  const label = formatDueLabel(value) ?? (value ? String(value) : null)

  return (
    <div ref={rootRef} className={`date-picker ${className}`.trim()}>
      <button
        type="button"
        className="date-picker-trigger"
        data-testid="due-date-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label ? (
          <span className="date-picker-value">{label}</span>
        ) : (
          <span className="date-picker-placeholder">{placeholder}</span>
        )}
      </button>

      {open ? (
        <div
          className="date-picker-popover"
          data-testid="due-date-calendar"
          role="dialog"
          aria-label="Choose due date"
        >
          <div className="date-picker-header">
            <button
              type="button"
              className="chip"
              data-testid={view === 'years' ? 'due-year-prev' : 'due-date-prev'}
              aria-label={view === 'years' ? 'Previous years' : 'Previous month'}
              onClick={() =>
                view === 'years'
                  ? setYearRangeStart((start) => start - YEAR_BLOCK)
                  : goToMonth(-1)
              }
            >
              ‹
            </button>
            {view === 'years' ? (
              <strong data-testid="due-year-range">
                {years[0]}–{years[years.length - 1]}
              </strong>
            ) : (
              <button
                type="button"
                className="date-picker-year-btn"
                data-testid="due-date-year-toggle"
                aria-label="Choose a year"
                title="Choose a year"
                onClick={openYearView}
              >
                {formatMonthLabel(monthCursor)}
              </button>
            )}
            <button
              type="button"
              className="chip"
              data-testid={view === 'years' ? 'due-year-next' : 'due-date-next'}
              aria-label={view === 'years' ? 'Next years' : 'Next month'}
              onClick={() =>
                view === 'years'
                  ? setYearRangeStart((start) => start + YEAR_BLOCK)
                  : goToMonth(1)
              }
            >
              ›
            </button>
          </div>

          {view === 'years' ? (
            <div className="date-picker-year-grid" role="grid">
              {years.map((year) => (
                <button
                  type="button"
                  key={year}
                  className={[
                    'date-picker-year',
                    year === monthCursor.getFullYear() ? 'selected' : '',
                    year === startOfToday().getFullYear() ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-testid={`due-date-year-${year}`}
                  aria-pressed={year === monthCursor.getFullYear()}
                  onClick={() => selectYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="date-picker-weekdays" aria-hidden="true">
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="date-picker-grid" role="grid">
                {cells.map((cell, index) =>
                  cell ? (
                    <button
                      type="button"
                      key={cell.key}
                      className={[
                        'date-picker-day',
                        cell.key === selectedKey ? 'selected' : '',
                        cell.key === todayKey ? 'today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-testid={`due-date-day-${cell.key}`}
                      aria-pressed={cell.key === selectedKey}
                      onClick={() => selectDay(cell.key)}
                    >
                      {cell.day}
                    </button>
                  ) : (
                    <span
                      key={`blank-${index}`}
                      className="date-picker-day empty"
                      aria-hidden="true"
                    />
                  )
                )}
              </div>
            </>
          )}

          {onClear ? (
            <div className="date-picker-actions">
              <button
                type="button"
                className="secondary-btn"
                data-testid="due-date-clear"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
