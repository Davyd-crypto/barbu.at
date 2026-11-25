import { useCallback, useState } from 'react'
import { CalendarView } from './CalendarView.tsx'
import { EventSheet } from './EventSheet.tsx'
import { CalendarIcon, TasksIcon } from './icons.tsx'
import { courses, tasks, term, type CalEvent } from './model.ts'
import { TasksView } from './TasksView.tsx'
import { formatLongDate, useNow } from './time.ts'
import { CourseTag } from './ui.tsx'
import { useDone } from './useDone.ts'
import { useStoredState } from './useStoredState.ts'
import './calendar.css'

const VIEWS = ['tasks', 'calendar'] as const
const LABELS = { tasks: 'Aufgaben', calendar: 'Kalender' }
const ICONS = { tasks: TasksIcon, calendar: CalendarIcon }
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap'

export function CalendarPrototype() {
  const now = useNow()
  const done = useDone()
  const [view, setView] = useStoredState('calendar:view', 'tasks', VIEWS)
  const [open, setOpen] = useState<CalEvent | null>(null)
  const close = useCallback(() => setOpen(null), [])

  const t = now.getTime()
  const pending = tasks.filter((task) => !done.has(task.id) && task.due.getTime() > t)
  const running = pending.filter((task) => task.opens && task.opens.getTime() <= t).length

  return (
    <div className="cal" lang="de">
      <title>Kalender</title>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <meta name="theme-color" content="#f5f5f5" />

      <aside className="cal-sidebar">
        <div className="cal-brand">
          <span className="cal-brand-mark">
            <CalendarIcon size={18} />
          </span>
          <span>
            <strong>Semester</strong>
            {term && <small>{term}</small>}
          </span>
        </div>

        <nav className="cal-nav-list">
          {VIEWS.map((v) => {
            const Icon = ICONS[v]
            return (
              <button key={v} className="cal-nav-item" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
                <Icon />
                {LABELS[v]}
                {v === 'tasks' && running > 0 && <span className="cal-nav-count">{running}</span>}
              </button>
            )
          })}
        </nav>

        <div className="cal-sidebar-section">
          <p className="cal-eyebrow">Fächer</p>
          <ul className="cal-course-list">
            {courses.map((c) => (
              <li key={c.id}>
                <CourseTag course={c} />
                <span className="cal-course-name">{c.name}</span>
                <span className="cal-course-count" title="offene Aufgaben">
                  {pending.filter((task) => task.course === c).length}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="cal-sidebar-foot">{formatLongDate(now)}</p>
      </aside>

      <header className="cal-topbar">
        <span className="cal-brand-mark">
          <CalendarIcon size={18} />
        </span>
        <div className="cal-tabs" role="tablist">
          {VIEWS.map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
              {LABELS[v]}
            </button>
          ))}
        </div>
      </header>

      <main className="cal-main">
        {view === 'tasks' ? <TasksView now={now} onOpen={setOpen} /> : <CalendarView now={now} onOpen={setOpen} />}
      </main>

      {open && <EventSheet event={open} now={now} onClose={close} onOpen={setOpen} />}
    </div>
  )
}
