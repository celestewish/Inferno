import { useMemo, useState } from 'react'
import {
  formatDayLabel as dayLabel,
  formatMonthLabel as monthLabel,
  parseDueDate as parseDue,
  startOfToday,
  toISODate as dayKey,
} from '../lib/dates.js'

// Due-date calendar built from task `due` values. Dates selected through the UI
// are canonical ISO strings; legacy free-text values are best-effort parsed via
// the shared helpers. Anything unparseable falls into "No due date".

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ tasks, projects, onOpenTask }) {
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? 'Project'

  const [viewMode, setViewMode] = useState('month')
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(null)

  const today = startOfToday()
  const todayKey = dayKey(today)

  const { dated, undated, tasksByDay } = useMemo(() => {
    const datedList = []
    const undatedList = []
    const byDay = new Map()
    tasks.forEach((task) => {
      const date = parseDue(task.due)
      if (date) {
        datedList.push({ task, date })
        const key = dayKey(date)
        if (!byDay.has(key)) byDay.set(key, [])
        byDay.get(key).push(task)
      } else {
        undatedList.push(task)
      }
    })
    datedList.sort((a, b) => a.date - b.date)
    return { dated: datedList, undated: undatedList, tasksByDay: byDay }
  }, [tasks])

  const overdueCount = dated.filter(
    ({ task, date }) => date < today && !task.completed
  ).length

  // ── Agenda (list) grouping ──
  const groups = useMemo(() => {
    const list = []
    const index = new Map()
    dated.forEach(({ task, date }) => {
      const key = dayKey(date)
      if (!index.has(key)) {
        index.set(key, list.length)
        list.push({ key, date, items: [] })
      }
      list[index.get(key)].items.push(task)
    })
    return list
  }, [dated])

  // ── Month grid cells ──
  const monthCells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      const key = dayKey(date)
      cells.push({ day, key, date, tasks: tasksByDay.get(key) ?? [] })
    }
    return cells
  }, [monthCursor, tasksByDay])

  const selectedTasks = selectedDay ? tasksByDay.get(selectedDay) ?? [] : []

  const goToMonth = (delta) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(todayKey)
  }

  const renderTaskButton = (task, testidPrefix = 'agenda-item') => (
    <li key={task.id}>
      <button
        type="button"
        className="agenda-item"
        data-testid={`${testidPrefix}-${task.id}`}
        onClick={() => onOpenTask({ ...task })}
      >
        <span className={task.completed ? 'agenda-title done' : 'agenda-title'}>
          {task.title}
        </span>
        <span className="agenda-sub">
          {projectName(task.projectId)} · {task.assignee}
        </span>
      </button>
    </li>
  )

  return (
    <section className="calendar-view" data-testid="calendar-view" aria-label="Calendar">
      <header className="view-header">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Calendar</h1>
          <p className="muted-copy">
            Work by due date across every project on this board.
          </p>
        </div>
        <div className="view-header-stats">
          <div className="mini-stat">
            <span>{dated.length}</span>
            <p>Scheduled</p>
          </div>
          <div className="mini-stat">
            <span>{overdueCount}</span>
            <p>Overdue</p>
          </div>
        </div>
      </header>

      <div className="calendar-mode-toggle" data-testid="calendar-mode-toggle" role="tablist" aria-label="Calendar view mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'month'}
          className={viewMode === 'month' ? 'chip active' : 'chip'}
          data-testid="calendar-mode-month"
          onClick={() => setViewMode('month')}
        >
          Month
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'list'}
          className={viewMode === 'list' ? 'chip active' : 'chip'}
          data-testid="calendar-mode-list"
          onClick={() => setViewMode('list')}
        >
          List
        </button>
      </div>

      {viewMode === 'month' ? (
        <div className="panel calendar-month" data-testid="calendar-month">
          <div className="calendar-month-header">
            <button
              type="button"
              className="chip"
              data-testid="calendar-prev-month"
              aria-label="Previous month"
              onClick={() => goToMonth(-1)}
            >
              ‹
            </button>
            <strong className="calendar-month-title">{monthLabel(monthCursor)}</strong>
            <div className="calendar-month-nav-end">
              <button
                type="button"
                className="chip"
                data-testid="calendar-today"
                onClick={goToToday}
              >
                Today
              </button>
              <button
                type="button"
                className="chip"
                data-testid="calendar-next-month"
                aria-label="Next month"
                onClick={() => goToMonth(1)}
              >
                ›
              </button>
            </div>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid" role="grid">
            {monthCells.map((cell, index) => {
              if (!cell) return <span key={`blank-${index}`} className="calendar-cell empty" />
              const hasTasks = cell.tasks.length > 0
              const isToday = cell.key === todayKey
              const isSelected = cell.key === selectedDay
              const classNames = [
                'calendar-cell',
                hasTasks ? 'has-tasks' : '',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  type="button"
                  key={cell.key}
                  className={classNames}
                  data-testid={`calendar-day-${cell.key}`}
                  aria-pressed={isSelected}
                  aria-label={`${dayLabel(cell.date)}${hasTasks ? `, ${cell.tasks.length} task${cell.tasks.length === 1 ? '' : 's'}` : ''}`}
                  onClick={() => setSelectedDay(cell.key)}
                >
                  <span className="calendar-cell-head">
                    <span className="calendar-cell-day">{cell.day}</span>
                    {hasTasks ? (
                      <span className="calendar-cell-count" aria-hidden="true">{cell.tasks.length}</span>
                    ) : null}
                  </span>
                  {hasTasks ? (
                    <span className="calendar-cell-tasks" aria-hidden="true">
                      {cell.tasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={task.completed ? 'calendar-chip done' : 'calendar-chip'}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                      ))}
                      {cell.tasks.length > 3 ? (
                        <span className="calendar-chip more">+{cell.tasks.length - 3} more</span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {viewMode === 'month' ? (
        <div className="panel calendar-day-detail" data-testid="calendar-day-detail">
          {selectedDay ? (
            <>
              <div className="section-heading">
                <h2>{dayLabel(new Date(`${selectedDay}T00:00:00`))}</h2>
                <span>{selectedTasks.length}</span>
              </div>
              {selectedTasks.length ? (
                <ul className="agenda-items">
                  {selectedTasks.map((task) => renderTaskButton(task, 'calendar-day-task'))}
                </ul>
              ) : (
                <p className="muted-copy">No tasks due on this day.</p>
              )}
            </>
          ) : (
            <p className="muted-copy">Select a day to see the tasks due then.</p>
          )}
        </div>
      ) : null}

      {viewMode === 'list' ? (
        groups.length ? (
          <ol className="agenda">
            {groups.map((group) => {
              const isOverdue = group.date < today
              return (
                <li key={group.key} className="agenda-day">
                  <div className={isOverdue ? 'agenda-date overdue' : 'agenda-date'}>
                    <strong>{dayLabel(group.date)}</strong>
                    {isOverdue ? <small>Overdue</small> : null}
                  </div>
                  <ul className="agenda-items">
                    {group.items.map((task) => renderTaskButton(task))}
                  </ul>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="panel view-empty" data-testid="calendar-empty">
            <p className="muted-copy">
              No tasks have a recognizable due date yet. Add due dates to tasks and they'll appear here.
            </p>
          </div>
        )
      ) : null}

      {undated.length ? (
        <div className="panel agenda-undated" data-testid="calendar-undated">
          <div className="section-heading">
            <h2>No due date</h2>
            <span>{undated.length}</span>
          </div>
          <ul className="agenda-items">
            {undated.map((task) => renderTaskButton(task, 'calendar-undated-item'))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
