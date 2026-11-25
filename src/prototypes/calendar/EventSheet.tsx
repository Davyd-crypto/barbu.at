import { useEffect } from 'react'
import { CheckIcon, ChevronRight, CloseIcon } from './icons.tsx'
import { eventTime } from './labels.ts'
import { taskById, tasksByOpens, type CalEvent } from './model.ts'
import { dayCount, formatDuration, formatLongDate, formatRelativeDay, formatShort } from './time.ts'
import { CertaintyBadge, CourseTag, KindBadge } from './ui.tsx'
import { setDone, useDone } from './useDone.ts'

interface Props {
  event: CalEvent
  now: Date
  onClose: () => void
  onOpen: (event: CalEvent) => void
}

/* Details of one entry: bottom sheet on phones, dialog on larger screens */
export function EventSheet({ event, now, onClose, onOpen }: Props) {
  const done = useDone()
  const task = taskById.get(event.id)
  const opensTasks = tasksByOpens.get(event.id) ?? []
  const isDone = done.has(event.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const t = now.getTime()
  const day = event.kind === 'deadline' ? new Date(event.end.getTime() - 1) : event.start
  const running = task && task.due.getTime() > t

  return (
    <div className="cal-overlay" onClick={onClose}>
      <div
        className="cal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cal-sheet-head">
          <span className="cal-task-top">
            <CourseTag course={event.course} />
            <span className="cal-task-course">{event.course.name}</span>
          </span>
          <button className="cal-btn ghost icon" onClick={onClose} aria-label="Schließen" autoFocus>
            <CloseIcon />
          </button>
        </div>

        <h2 id="cal-sheet-title" className="cal-sheet-title">
          {event.title}
        </h2>
        <p className="cal-sheet-when">
          <KindBadge event={event} />
          <CertaintyBadge event={event} />
          <span>
            {formatLongDate(day)} · {eventTime(event)}
          </span>
        </p>

        {task && (
          <dl className="cal-facts">
            <div>
              <dt>{running ? 'Verbleibend' : 'Vorbei seit'}</dt>
              <dd className="big">{running ? formatDuration(task.due.getTime() - t) : dayCount(t - task.due.getTime())}</dd>
            </div>
            <div>
              <dt>Fällig</dt>
              <dd>{formatRelativeDay(task.due, now)}</dd>
            </div>
            <div>
              <dt>{task.prep ? 'Lernen ab' : 'Begonnen'}</dt>
              <dd>{task.opens ? formatShort(task.opens) : '–'}</dd>
            </div>
            {running && task.opens && task.opens.getTime() <= t && (
              <div>
                <dt>Offen seit</dt>
                <dd>{dayCount(t - task.opens.getTime())}</dd>
              </div>
            )}
          </dl>
        )}

        {opensTasks.map((tk) => (
          <button key={tk.id} className="cal-related" onClick={() => onOpen(tk.event)}>
            <span>
              <small>Abgabe dazu</small>
              <strong>{tk.title}</strong>
              <small>bis {formatRelativeDay(tk.due, now)}</small>
            </span>
            <ChevronRight />
          </button>
        ))}

        {task?.opensEvent && (
          <button className="cal-related" onClick={() => onOpen(task.opensEvent!)}>
            <span>
              <small>Begonnen mit</small>
              <strong>{task.opensEvent.title}</strong>
              <small>{formatShort(task.opensEvent.start)}</small>
            </span>
            <ChevronRight />
          </button>
        )}

        {event.notes && <p className="cal-notes">{event.notes}</p>}

        {(event.location || event.source) && (
          <dl className="cal-small">
            {event.location && (
              <div>
                <dt>Ort</dt>
                <dd>{event.location}</dd>
              </div>
            )}
            {event.source && (
              <div>
                <dt>Quelle</dt>
                <dd>{event.source}</dd>
              </div>
            )}
          </dl>
        )}

        {task && (
          <button className={`cal-btn wide ${isDone ? 'secondary' : 'primary'}`} onClick={() => setDone(task.id, !isDone)}>
            <CheckIcon />{' '}
            {isDone
              ? `${task.prep ? 'Erledigt' : 'Abgegeben'} · rückgängig machen`
              : `Als ${task.prep ? 'erledigt' : 'abgegeben'} markieren`}
          </button>
        )}
      </div>
    </div>
  )
}
