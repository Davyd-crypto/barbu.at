import type { CalEvent } from './model.ts'
import { formatTime } from './time.ts'

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
