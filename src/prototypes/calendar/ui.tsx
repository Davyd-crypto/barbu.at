/* Small shared pieces: page header, badges */
import type { ReactNode } from 'react'
import { OpensIcon } from './icons.tsx'
import { courseStyle, kindLabel } from './labels.ts'
import type { CalEvent, Course } from './model.ts'

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="cal-page-header">
      <div>
        <p className="cal-eyebrow">{eyebrow}</p>
        <h1 className="cal-heading">{title}</h1>
      </div>
      {children && <div className="cal-page-actions">{children}</div>}
    </header>
  )
}

export function CourseTag({ course }: { course: Course }) {
  return (
    <span className="cal-badge course" style={courseStyle(course)} title={course.name}>
      {course.code}
    </span>
  )
}

/* Frist: soft · Prüfung: solid · Termin/Info: outline · öffnet: just the mark */
export function KindBadge({ event }: { event: CalEvent }) {
  if (event.kind === 'start') {
    return (
      <span className="cal-opens">
        <OpensIcon /> {kindLabel(event)}
      </span>
    )
  }
  const variant = event.kind === 'exam' ? 'solid' : event.kind === 'deadline' ? 'soft' : 'outline'
  return <span className={`cal-badge ${variant}`}>{kindLabel(event)}</span>
}

export function CertaintyBadge({ event }: { event: CalEvent }) {
  if (event.certainty === 'fest') return null
  return <span className="cal-badge soft muted">{event.certainty}</span>
}
