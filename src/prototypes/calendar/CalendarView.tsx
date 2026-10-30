import { useRef, useState, type TouchEvent } from 'react'
import { CheckIcon, ChevronLeft, ChevronRight, OpensIcon } from './icons.tsx'
import { eventTime } from './labels.ts'
import { courses, events, tasksByOpens, type CalEvent } from './model.ts'
import { addDays, dayKey, formatLongDate, formatMonth, formatShort, formatWeekday, sameDay, startOfDay, startOfWeek } from './time.ts'
import { CertaintyBadge, CourseTag, KindBadge, PageHeader } from './ui.tsx'
import { useDone } from './useDone.ts'
import { useStoredState } from './useStoredState.ts'

const MODES = ['month', 'week'] as const
type Mode = (typeof MODES)[number]

const MAX_CHIPS = 3 // per day in the month grid, the rest is "+N"
const SWIPE_PX = 50

/* Deadlines sit on the day they are due, all-day entries on every day they cover */
function daysOf(e: CalEvent) {
  if (e.kind === 'deadline') return [startOfDay(new Date(e.end.getTime() - 1))]
  if (!e.allDay) return [startOfDay(e.start)]
  const days: Date[] = []
  for (let d = startOfDay(e.start); d < e.end; d = addDays(d, 1)) days.push(d)
  return days.length ? days : [startOfDay(e.start)]
}

/* Time the entry is listed under: the deadline for deadlines, else the start */
const sortTime = (e: CalEvent) => (e.allDay ? 0 : (e.kind === 'deadline' ? e.end : e.start).getTime())

const byDay = new Map<string, CalEvent[]>()
for (const e of events) {
  for (const d of daysOf(e)) byDay.set(dayKey(d), [...(byDay.get(dayKey(d)) ?? []), e])
}
for (const list of byDay.values()) list.sort((a, b) => sortTime(a) - sortTime(b))

const eventsOn = (d: Date) => byDay.get(dayKey(d)) ?? []

interface Props {
  now: Date
  onOpen: (event: CalEvent) => void
}

export function CalendarView({ now, onOpen }: Props) {
  const [mode, setMode] = useStoredState<Mode>('calendar:mode', 'month', MODES)
  const [cursor, setCursor] = useState(() => startOfDay(now))
  const [selected, setSelected] = useState(() => startOfDay(now))
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function move(step: number) {
    const next =
      mode === 'month'
        ? new Date(cursor.getFullYear(), cursor.getMonth() + step, 1)
        : addDays(startOfWeek(cursor), 7 * step)
    setCursor(next)
    setSelected(next)
  }

  function today() {
    setCursor(startOfDay(now))
    setSelected(startOfDay(now))
  }

  function onTouchStart(e: TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 2 * Math.abs(dy)) move(dx < 0 ? 1 : -1)
  }

  const weekStart = startOfWeek(cursor)
  const title = mode === 'month' ? formatMonth(cursor) : weekTitle(weekStart)

  return (
    <div className="cal-page">
      <PageHeader eyebrow="Kalender" title={title}>
        <div className="cal-tabs" role="tablist">
          {MODES.map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
              {m === 'month' ? 'Monat' : 'Woche'}
            </button>
          ))}
        </div>
        <div className="cal-pager">
          <button className="cal-btn outline icon" onClick={() => move(-1)} aria-label="Zurück">
            <ChevronLeft />
          </button>
          <button className="cal-btn outline" onClick={today}>
            Heute
          </button>
          <button className="cal-btn outline icon" onClick={() => move(1)} aria-label="Weiter">
            <ChevronRight />
          </button>
        </div>
      </PageHeader>

      <div className="cal-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {mode === 'month' ? (
          <MonthGrid cursor={cursor} now={now} selected={selected} onSelect={setSelected} onOpen={onOpen} />
        ) : (
          <WeekGrid start={weekStart} now={now} onOpen={onOpen} />
        )}
        <div className="cal-legend cal-legend-kinds">
          <span className="cal-badge soft">Frist</span>
          <span className="cal-opens">
            <OpensIcon /> öffnet
          </span>
          <span className="cal-badge solid">Prüfung</span>
          <span className="cal-badge outline">Termin</span>
        </div>
      </div>

      {mode === 'month' && <DayList day={selected} now={now} onOpen={onOpen} />}

      <ul className="cal-legend cal-legend-courses">
        {courses.map((c) => (
          <li key={c.id}>
            <CourseTag course={c} /> {c.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function weekTitle(start: Date) {
  const end = addDays(start, 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const from = `${start.getDate()}.${sameMonth ? '' : ` ${formatMonth(start).split(' ')[0]}`}`
  return `${from} – ${end.getDate()}. ${formatMonth(end)}`
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

interface MonthProps {
  cursor: Date
  now: Date
  selected: Date
  onSelect: (d: Date) => void
  onOpen: (e: CalEvent) => void
}

function MonthGrid({ cursor, now, selected, onSelect, onOpen }: MonthProps) {
  const done = useDone()
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + daysInMonth(first)) / 7)
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="cal-month">
      {days.slice(0, 7).map((d) => (
        <div key={`h${d.getDay()}`} className="cal-weekday">
          {formatWeekday(d)}
        </div>
      ))}
      {days.map((d) => {
        const list = eventsOn(d)
        const classes = [
          'cal-day',
          d.getMonth() !== cursor.getMonth() && 'outside',
          sameDay(d, now) && 'today',
          sameDay(d, selected) && 'selected',
        ]
        return (
          <div key={dayKey(d)} className={classes.filter(Boolean).join(' ')}>
            <button className="cal-day-hit" onClick={() => onSelect(d)} aria-label={`${d.getDate()}., ${list.length} Einträge`} />
            <span className="cal-day-num">{d.getDate()}</span>
            <span className="cal-day-dots" aria-hidden="true">
              {list.slice(0, 4).map((e) => (
                <span key={e.id} className={`cal-dot ${e.kind}`} />
              ))}
            </span>
            <span className="cal-day-chips">
              {list.slice(0, MAX_CHIPS).map((e) => (
                <button
                  key={e.id}
                  className={`cal-chip ${e.kind} ${done.has(e.id) ? 'done' : ''}`}
                  onClick={() => onOpen(e)}
                  title={`${e.course.code}: ${e.title}`}
                >
                  {e.kind === 'start' && <OpensIcon />}
                  <b>{e.course.code}</b>
                  <span>{e.title}</span>
                </button>
              ))}
              {list.length > MAX_CHIPS && (
                <button className="cal-chip-more" onClick={() => onSelect(d)}>
                  +{list.length - MAX_CHIPS} weitere
                </button>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DayList({ day, now, onOpen }: { day: Date; now: Date; onOpen: (e: CalEvent) => void }) {
  const list = eventsOn(day)
  const label = sameDay(day, now) ? 'Heute' : sameDay(day, addDays(now, 1)) ? 'Morgen' : ''
  return (
    <section className="cal-section">
      <h2 className="cal-section-title">
        {label && <span>{label}</span>}
        <span className={label ? 'cal-muted' : ''}>{formatLongDate(day)}</span>
      </h2>
      {list.length === 0 ? (
        <p className="cal-empty">Keine Einträge.</p>
      ) : (
        <ul className="cal-card cal-list">
          {list.map((e) => (
            <EventRow key={e.id} event={e} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  )
}

function EventRow({ event: e, onOpen }: { event: CalEvent; onOpen: (e: CalEvent) => void }) {
  const done = useDone().has(e.id)
  const opens = tasksByOpens.get(e.id) ?? []
  return (
    <li>
      <button className={`cal-event-row ${e.kind} ${done ? 'done' : ''}`} onClick={() => onOpen(e)}>
        <span className="cal-event-time">{eventTime(e)}</span>
        <span className="cal-event-body">
          <span className="cal-event-title">
            {done && <CheckIcon size={14} />}
            {e.title}
          </span>
          <span className="cal-event-meta">
            <CourseTag course={e.course} />
            <KindBadge event={e} />
            <CertaintyBadge event={e} />
            {opens.map((t) => (
              <span key={t.id}>Abgabe bis {formatShort(t.due)}</span>
            ))}
          </span>
        </span>
      </button>
    </li>
  )
}

function WeekGrid({ start, now, onOpen }: { start: Date; now: Date; onOpen: (e: CalEvent) => void }) {
  const done = useDone()
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="cal-week">
      {days.map((d) => {
        const list = eventsOn(d)
        return (
          <section key={dayKey(d)} className={`cal-week-day ${sameDay(d, now) ? 'today' : ''} ${list.length ? '' : 'empty'}`}>
            <h3 className="cal-week-head">
              <span>{formatWeekday(d)}</span>
              <strong>{d.getDate()}</strong>
            </h3>
            <ul className="cal-week-events">
              {list.map((e) => (
                <li key={e.id}>
                  <button className={`cal-tile ${e.kind} ${done.has(e.id) ? 'done' : ''}`} onClick={() => onOpen(e)}>
                    <span className="cal-tile-time">
                      {e.kind === 'start' && <OpensIcon />}
                      {eventTime(e)}
                    </span>
                    <span className="cal-tile-title">{e.title}</span>
                    <span className="cal-tile-course">{e.course.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
