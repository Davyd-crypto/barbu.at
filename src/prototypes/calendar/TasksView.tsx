import { useEffect, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronDown } from './icons.tsx'
import { events, tasks, type CalEvent, type Task } from './model.ts'
import { DAY, dayCount, formatDuration, formatLongDate, formatRelativeDay, formatShort } from './time.ts'
import { CertaintyBadge, CourseTag, PageHeader } from './ui.tsx'
import { setDone, useDone } from './useDone.ts'

const SOON_DAYS = 14 // "Demnächst" shows deadlines this far ahead (at least SOON_MIN), the rest behind a button
const SOON_MIN = 3
const OVERDUE_DAYS = 14 // missed deadlines older than this are only in the calendar
const UNDO_MS = 5000

interface Props {
  now: Date
  onOpen: (event: CalEvent) => void
}

export function TasksView({ now, onOpen }: Props) {
  const done = useDone()
  const [showAll, setShowAll] = useState(false)
  const [undo, setUndo] = useState<Task | null>(null)

  useEffect(() => {
    if (!undo) return
    const id = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(id)
  }, [undo])

  function check(task: Task) {
    setDone(task.id, true)
    setUndo(task)
  }

  const t = now.getTime()
  const open = tasks.filter((task) => !done.has(task.id))
  const isActive = (task: Task) => task.opens !== undefined && task.opens.getTime() <= t && task.due.getTime() > t
  const active = open.filter(isActive)
  const upcoming = open.filter((task) => task.due.getTime() > t && !isActive(task))
  const soon = upcoming.filter((task, i) => i < SOON_MIN || task.due.getTime() - t < SOON_DAYS * DAY)
  const overdue = open
    .filter((task) => task.due.getTime() <= t && t - task.due.getTime() < OVERDUE_DAYS * DAY)
    .reverse()
  const recentlyDone = tasks.filter((task) => done.has(task.id) && t - task.due.getTime() < OVERDUE_DAYS * DAY)

  const nextTask = open.find((task) => task.due.getTime() > t)
  const nextExam = events.find((e) => e.kind === 'exam' && e.start.getTime() > t)
  const listed = showAll ? upcoming : soon

  return (
    <div className="cal-page">
      <PageHeader eyebrow={formatLongDate(now)} title="Aufgaben" />

      <div className="cal-stats">
        <Stat label="Laufend" value={String(active.length)} />
        <Stat
          label="Nächste Frist"
          value={nextTask ? formatDuration(nextTask.due.getTime() - t) : '–'}
          onClick={nextTask ? () => onOpen(nextTask.event) : undefined}
        />
        <Stat
          label="Nächste Prüfung"
          value={nextExam ? formatDuration(nextExam.start.getTime() - t) : '–'}
          onClick={nextExam ? () => onOpen(nextExam) : undefined}
        />
      </div>

      <section className="cal-section">
        <SectionTitle title="Läuft gerade" count={active.length} />
        {active.length === 0 ? (
          <p className="cal-empty">Nichts offen, das schon begonnen hat.</p>
        ) : (
          <div className="cal-task-grid">
            {active.map((task) => (
              <ActiveCard key={task.id} task={task} now={now} onCheck={() => check(task)} onOpen={() => onOpen(task.event)} />
            ))}
          </div>
        )}
      </section>

      {overdue.length > 0 && (
        <Fold label={`${overdue.length} ${overdue.length === 1 ? 'Frist' : 'Fristen'} vorbei, nicht abgehakt`} alert>
          <ul className="cal-card cal-list">
            {overdue.map((task) => (
              <TaskRow key={task.id} task={task} now={now} onCheck={() => check(task)} onOpen={() => onOpen(task.event)} />
            ))}
          </ul>
        </Fold>
      )}

      <section className="cal-section">
        <SectionTitle title="Demnächst" count={upcoming.length} />
        {listed.length === 0 ? (
          <p className="cal-empty">Keine kommenden Fristen.</p>
        ) : (
          <ul className="cal-card cal-list">
            {listed.map((task) => (
              <TaskRow key={task.id} task={task} now={now} onCheck={() => check(task)} onOpen={() => onOpen(task.event)} />
            ))}
          </ul>
        )}
        {upcoming.length > soon.length && (
          <button className="cal-btn cal-more" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Weniger anzeigen' : `Alle ${upcoming.length} anzeigen`}
          </button>
        )}
      </section>

      {recentlyDone.length > 0 && (
        <Fold label={`Abgegeben · ${recentlyDone.length}`}>
          <ul className="cal-card cal-list">
            {recentlyDone.map((task) => (
              <TaskRow key={task.id} task={task} now={now} done onCheck={() => setDone(task.id, false)} onOpen={() => onOpen(task.event)} />
            ))}
          </ul>
        </Fold>
      )}

      {undo && (
        <div className="cal-toast" role="status">
          <span>
            <CheckIcon /> {undo.course.code} · {undo.title}
          </span>
          <button
            onClick={() => {
              setDone(undo.id, false)
              setUndo(null)
            }}
          >
            Rückgängig
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="cal-stat-label">{label}</span>
      <span className="cal-stat-value">{value}</span>
    </>
  )
  return onClick ? (
    <button className="cal-card cal-stat-card" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="cal-card cal-stat-card">{content}</div>
  )
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="cal-section-title">
      {title}
      {count > 0 && <span className="cal-badge outline">{count}</span>}
    </h2>
  )
}

function Fold({ label, alert = false, children }: { label: string; alert?: boolean; children: ReactNode }) {
  return (
    <details className="cal-fold">
      <summary className="cal-btn outline">
        {alert && <i className="cal-mark" />}
        {label}
        <ChevronDown />
      </summary>
      {children}
    </details>
  )
}

interface ItemProps {
  task: Task
  now: Date
  onCheck: () => void
  onOpen: () => void
}

function ActiveCard({ task, now, onCheck, onOpen }: ItemProps) {
  const opens = task.opens!
  const left = task.due.getTime() - now.getTime()
  const total = task.due.getTime() - opens.getTime()
  const progress = total > 0 ? Math.min(1, (now.getTime() - opens.getTime()) / total) : 1

  return (
    <article className="cal-card cal-task-card">
      <button className="cal-task-main" onClick={onOpen}>
        <span className="cal-task-top">
          <CourseTag course={task.course} />
          <span className="cal-task-course">{task.course.name}</span>
          <CertaintyBadge event={task.event} />
        </span>
        <span className="cal-task-title">{task.title}</span>
        <span className="cal-stat">
          <span className="cal-stat-label">
            {left < DAY && <i className="cal-mark" />}
            Verbleibend
          </span>
          <span className="cal-stat-value">{formatDuration(left)}</span>
        </span>
        <span className="cal-progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="cal-task-meta">
          <span>Seit {dayCount(now.getTime() - opens.getTime())} offen</span>
          <span>{Math.round(progress * 100)} % der Zeit um</span>
        </span>
      </button>
      <div className="cal-card-footer">
        <span>Fällig {formatRelativeDay(task.due, now)}</span>
        <button className="cal-btn primary" onClick={onCheck}>
          <CheckIcon /> Abgegeben
        </button>
      </div>
    </article>
  )
}

function TaskRow({ task, now, onCheck, onOpen, done = false }: ItemProps & { done?: boolean }) {
  const left = task.due.getTime() - now.getTime()
  const opensLater = task.opens && task.opens > now

  return (
    <li className={`cal-row ${done ? 'done' : ''}`}>
      <button
        className={`cal-checkbox ${done ? 'checked' : ''}`}
        onClick={onCheck}
        aria-label={done ? `${task.title}: als offen markieren` : `${task.title}: als abgegeben markieren`}
      >
        <CheckIcon size={12} />
      </button>
      <button className="cal-row-main" onClick={onOpen}>
        <span className="cal-row-title">{task.title}</span>
        <span className="cal-row-meta">
          <CourseTag course={task.course} />
          <span>
            bis {formatRelativeDay(task.due, now)}
            {opensLater && ` · öffnet ${formatShort(task.opens!, false)}`}
          </span>
        </span>
      </button>
      <span className={`cal-badge cal-row-left ${!done && left > 0 && left < DAY ? 'solid' : 'soft'}`}>
        {!done && left <= 0 && <i className="cal-mark" />}
        {left > 0 ? `in ${formatDuration(left)}` : `vor ${formatDuration(-left)}`}
      </span>
    </li>
  )
}
