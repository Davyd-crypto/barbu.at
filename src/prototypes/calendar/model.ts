/*
 * Turns the .ics files in ./ics into courses, calendar entries and tasks.
 *
 * A task is every entry with CATEGORIES:deadline; it is due at DTEND. Its
 * start is the entry of the same course that announces it ("UE1 Abgabe öffnet",
 * "Assignment 1 verfügbar", "… – Beginn"), matched by title.
 */
import { parseIcs, type IcsEvent } from './ics.ts'

const files = import.meta.glob<string>('./ics/*.ics', { query: '?raw', import: 'default', eager: true })

export type Kind = 'deadline' | 'exam' | 'session' | 'start' | 'info'
export type Certainty = 'fest' | 'vorläufig' | 'widersprüchlich'

export interface Course {
  id: string
  code: string
  name: string
}

export interface CalEvent {
  id: string
  course: Course
  title: string
  kind: Kind
  certainty: Certainty
  notes: string
  source: string
  location: string
  start: Date
  end: Date
  allDay: boolean
}

export interface Task {
  id: string
  course: Course
  title: string
  event: CalEvent
  opensEvent: CalEvent | undefined
  opens: Date | undefined
  due: Date
}

const START_WORDS = new Set(['öffnet', 'verfügbar', 'veröffentlicht', 'beginn'])
const MARKER_WORDS = new Set([...START_WORDS, 'abgabe', 'finale', 'ende', 'frist', '–', '-'])

function kindOf(categories: string[], title: string): Kind {
  if (categories.includes('deadline')) return 'deadline'
  if (categories.includes('exam')) return 'exam'
  if (categories.some((c) => ['tutorial', 'exercise', 'interview', 'lecture'].includes(c))) return 'session'
  if (words(title).some((w) => START_WORDS.has(w))) return 'start'
  return 'info'
}

function words(title: string) {
  return title.toLowerCase().split(/\s+/).filter(Boolean)
}

/* "UE1 Abgabe öffnet" and "UE1 Abgabe" both become "ue1" */
function matchKey(title: string) {
  return words(title)
    .filter((w) => !MARKER_WORDS.has(w))
    .join(' ')
}

/* "TU: Theoretische Informatik 2026W" → "Theoretische Informatik" */
function courseName(calName: string, file: string) {
  const name = calName.replace(/^[^:]{1,6}:\s*/, '').replace(/\s+\d{4}[WS]$/, '')
  return name || file.replace(/^.*\//, '').replace(/\.ics$/i, '').replaceAll('_', ' ')
}

/* Splits "FRIST: …. Text\nStatus: fest\nQuelle: …" into its parts */
function parseDescription(description: string) {
  let certainty: Certainty = 'fest'
  let source = ''
  const notes: string[] = []
  for (const line of description.split('\n')) {
    const status = /^Status:\s*(.+)$/i.exec(line)
    const quelle = /^Quelle:\s*(.+)$/i.exec(line)
    if (status) {
      const value = status[1].trim().toLowerCase()
      if (value === 'vorläufig' || value === 'widersprüchlich') certainty = value
    } else if (quelle) source = quelle[1].trim()
    else notes.push(line)
  }
  const text = notes
    .join('\n')
    .replace(/^FRIST:\s*[\d.]+(?:\s+\d{1,2}:\d{2})?\.\s*/, '')
    .trim()
  return { certainty, source, notes: text }
}

function toCalEvent(event: IcsEvent, course: Course): CalEvent {
  const tags = [...event.summary.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].toLowerCase())
  const title = event.summary
    .replace(/^[^:\s]{1,8}:\s*/, (prefix) => (prefix.startsWith(`${course.code}:`) ? '' : prefix))
    .replace(/\s*\[[^\]]+\]/g, '')
    .trim()
  const { certainty, source, notes } = parseDescription(event.description)
  const tagged = tags.find((t): t is Certainty => t === 'vorläufig' || t === 'widersprüchlich')
  return {
    id: event.uid,
    course,
    title,
    kind: kindOf(event.categories, title),
    certainty: tagged ?? certainty,
    notes,
    source,
    location: event.location,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
  }
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}

function findOpens(task: CalEvent, candidates: CalEvent[]) {
  const key = matchKey(task.title)
  let best: CalEvent | undefined
  let bestLength = -1
  for (const c of candidates) {
    if (c.course !== task.course || c.start >= task.end) continue
    const k = matchKey(c.title)
    if (!k || (key !== k && !key.startsWith(`${k} `))) continue
    if (k.length > bestLength) {
      best = c
      bestLength = k.length
    }
  }
  return best
}

function build() {
  const calendars = Object.entries(files)
    .map(([file, text]) => ({ file, cal: parseIcs(text) }))
    .sort((a, b) => a.file.localeCompare(b.file))

  const courses: Course[] = []
  const events: CalEvent[] = []

  calendars.forEach(({ file, cal }) => {
    // Most entries are "TI: …"; the most common prefix is the course code
    const prefixes = cal.events.flatMap((e) => /^([^:\s]{1,8}):\s/.exec(e.summary)?.[1] ?? [])
    const code = mostCommon(prefixes) ?? courseName(cal.name, file).slice(0, 3).toUpperCase()

    const course: Course = { id: file, code, name: courseName(cal.name, file) }
    courses.push(course)
    events.push(...cal.events.map((e) => toCalEvent(e, course)))
  })

  events.sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title))

  const starts = events.filter((e) => e.kind === 'start')
  const tasks: Task[] = events
    .filter((e) => e.kind === 'deadline')
    .map((event) => {
      const opensEvent = findOpens(event, starts)
      return {
        id: event.id,
        course: event.course,
        title: event.title,
        event,
        opensEvent,
        opens: opensEvent?.start,
        // All-day deadlines end at midnight; show them as due at 23:59 that day
        due: event.allDay ? new Date(event.end.getTime() - 60_000) : event.end,
      }
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  // "… 2026W" → "WS 2026"
  const termMatch = calendars.map(({ cal }) => /(\d{4})([WS])$/.exec(cal.name.trim())).find(Boolean)
  const term = termMatch ? `${termMatch[2]}S ${termMatch[1]}` : ''

  return { courses, events, tasks, term }
}

export const { courses, events, tasks, term } = build()

export const taskById = new Map(tasks.map((t) => [t.id, t]))

/* Tasks announced by an entry like "UE1 Abgabe öffnet", by that entry's id */
export const tasksByOpens = new Map<string, Task[]>()
for (const t of tasks) {
  if (t.opensEvent) tasksByOpens.set(t.opensEvent.id, [...(tasksByOpens.get(t.opensEvent.id) ?? []), t])
}
