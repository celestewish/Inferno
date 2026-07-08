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
  const rootRef = useRef(null)

  const selectedDate = useMemo(() => parseDueDate(value), [value])
  const selectedKey = selectedDate ? toISODate(selectedDate) : null
  const todayKey = toISODate(startOfToday())

  const [monthCursor, setMonthCursor] = useState(
    () => selectedDate ?? startOfToday()
  )

  // Re-centre the grid on the selected month whenever the picker opens.
  useEffect(() => {
    if (open) setMonthCursor(selectedDate ?? startOfToday())
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
              data-testid="due-date-prev"
              aria-label="Previous month"
              onClick={() => goToMonth(-1)}
            >
              ‹
            </button>
            <strong>{formatMonthLabel(monthCursor)}</strong>
            <button
              type="button"
              className="chip"
              data-testid="due-date-next"
              aria-label="Next month"
              onClick={() => goToMonth(1)}
            >
              ›
            </button>
          </div>

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
