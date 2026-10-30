/*
 * Minimal iCalendar (RFC 5545) reader: VEVENTs with SUMMARY, DESCRIPTION,
 * LOCATION, CATEGORIES and DTSTART/DTEND (UTC, TZID or all-day dates).
 * No recurrence rules, the course calendars don't use them.
 */
export interface IcsEvent {
  uid: string
  summary: string
  description: string
  location: string
  categories: string[]
  start: Date
  end: Date
  allDay: boolean
}

export interface IcsCalendar {
  name: string
  timezone: string | undefined
  events: IcsEvent[]
}

interface Property {
  name: string
  params: Record<string, string>
  value: string
}

function parseLine(line: string): Property | null {
  // The value starts at the first colon outside a quoted parameter
  let quoted = false
  let colon = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted
    else if (line[i] === ':' && !quoted) {
      colon = i
      break
    }
  }
  if (colon < 0) return null

  const [name, ...rawParams] = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  for (const param of rawParams) {
    const eq = param.indexOf('=')
    if (eq > 0) params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) }
}

function unescapeText(value: string) {
  return value.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

/* Offset of `timeZone` from UTC at instant `t`, in ms */
function zoneOffset(t: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(t))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(t / 1000) * 1000
}

/* Wall-clock time in `timeZone` to an instant */
function zonedDate(fields: number[], timeZone: string) {
  const [y, mo, d, h, mi, s] = fields
  const wall = Date.UTC(y, mo - 1, d, h, mi, s)
  try {
    const first = wall - zoneOffset(wall, timeZone)
    // Second pass in case the first guess landed on the other side of a DST switch
    return new Date(wall - zoneOffset(first, timeZone))
  } catch {
    return new Date(y, mo - 1, d, h, mi, s) // unknown zone: treat as local time
  }
}

function parseDate({ params, value }: Property, defaultZone: string | undefined) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim())
  if (!m) return null
  const fields = m.slice(1, 7).map((v) => Number(v ?? 0))
  const [y, mo, d, h, mi, s] = fields

  if (!m[4]) return { date: new Date(y, mo - 1, d), allDay: true }
  if (m[7]) return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false }
  const zone = params.TZID ?? defaultZone
  return { date: zone ? zonedDate(fields, zone) : new Date(y, mo - 1, d, h, mi, s), allDay: false }
}

export function parseIcs(text: string): IcsCalendar {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')

  const calendar: IcsCalendar = { name: '', timezone: undefined, events: [] }
  const stack: string[] = []
  let props: Property[] = []

  for (const line of lines) {
    const prop = parseLine(line)
    if (!prop) continue

    if (prop.name === 'BEGIN') {
      stack.push(prop.value.toUpperCase())
      if (prop.value.toUpperCase() === 'VEVENT') props = []
      continue
    }
    if (prop.name === 'END') {
      if (stack.pop() === 'VEVENT') {
        const event = toEvent(props, calendar.timezone)
        if (event) calendar.events.push(event)
      }
      continue
    }

    const current = stack.at(-1)
    if (current === 'VEVENT') props.push(prop)
    else if (current === 'VCALENDAR') {
      if (prop.name === 'X-WR-CALNAME') calendar.name = unescapeText(prop.value)
      if (prop.name === 'X-WR-TIMEZONE') calendar.timezone = prop.value
    }
  }
  return calendar
}

function toEvent(props: Property[], defaultZone: string | undefined): IcsEvent | null {
  const find = (name: string) => props.find((p) => p.name === name)
  const startProp = find('DTSTART')
  const start = startProp && parseDate(startProp, defaultZone)
  if (!start) return null

  const endProp = find('DTEND')
  const end = endProp && parseDate(endProp, defaultZone)
  const fallbackEnd = start.allDay
    ? new Date(start.date.getFullYear(), start.date.getMonth(), start.date.getDate() + 1)
    : start.date

  const text = (name: string) => unescapeText(find(name)?.value ?? '').trim()
  return {
    uid: text('UID') || `${text('SUMMARY')}@${start.date.toISOString()}`,
    summary: text('SUMMARY'),
    description: text('DESCRIPTION'),
    location: text('LOCATION'),
    categories: props
      .filter((p) => p.name === 'CATEGORIES')
      .flatMap((p) => p.value.split(','))
      .map((c) => unescapeText(c).trim().toLowerCase())
      .filter(Boolean),
    start: start.date,
    end: end?.date ?? fallbackEnd,
    allDay: start.allDay,
  }
}
