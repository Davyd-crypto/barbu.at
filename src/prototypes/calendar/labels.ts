import type { CSSProperties } from 'react'
import { courses, type CalEvent, type Course } from './model.ts'
import { formatTime } from './time.ts'

/* One color per course, in file order; white text on each stays above 4.5:1 */
const COURSE_COLORS = ['#2563eb', '#047857', '#7c3aed', '#b45309', '#be185d', '#0f766e']

/* Sets --course, which the badges, chips, tiles and dots in calendar.css pick up */
export function courseStyle(course: Course) {
  const index = Math.max(0, courses.indexOf(course))
  return { '--course': COURSE_COLORS[index % COURSE_COLORS.length] } as CSSProperties
}

const KIND_LABEL: Record<CalEvent['kind'], string> = {
  deadline: 'Frist',
  exam: 'Prüfung',
  session: 'Termin',
  start: 'öffnet',
  info: 'Info',
}

export function kindLabel(e: CalEvent) {
  return KIND_LABEL[e.kind]
}

/* "bis 23:59", "15:15–17:00", "ganztägig"; the short ICS slots (30 min) show only their start */
export function eventTime(e: CalEvent) {
  if (e.allDay) return e.kind === 'deadline' ? 'bis Tagesende' : 'ganztägig'
  if (e.kind === 'deadline') return `bis ${formatTime(e.end)}`
  if (e.end.getTime() - e.start.getTime() > 30 * 60_000) return `${formatTime(e.start)}–${formatTime(e.end)}`
  return formatTime(e.start)
}
