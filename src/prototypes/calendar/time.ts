import { useEffect, useState } from 'react'

const LOCALE = 'de-AT'
const MINUTE = 60_000
const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/* Current time, refreshed every 30 s and when the tab becomes visible again */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return now
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/* Monday of the week containing `d` */
export function startOfWeek(d: Date) {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7))
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, options)
const TIME = fmt({ hour: '2-digit', minute: '2-digit' })
const SHORT = fmt({ weekday: 'short', day: 'numeric', month: 'numeric' })
const LONG = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const MONTH = fmt({ month: 'long', year: 'numeric' })
const WEEKDAY_SHORT = fmt({ weekday: 'short' })

export const formatTime = (d: Date) => TIME.format(d)
export const formatMonth = (d: Date) => MONTH.format(d)
export const formatLongDate = (d: Date) => LONG.format(d)
export const formatWeekday = (d: Date) => WEEKDAY_SHORT.format(d).replace('.', '')

/* "Do 12.11. 23:59" */
export function formatShort(d: Date, withTime = true) {
  const date = SHORT.format(d).replace(',', '').replace('.', '')
  return withTime ? `${date} ${formatTime(d)}` : date
}

/* "heute 23:59", "morgen 18:00", otherwise "Do 12.11. 23:59" */
export function formatRelativeDay(d: Date, now: Date) {
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY)
  if (days === 0) return `heute ${formatTime(d)}`
  if (days === 1) return `morgen ${formatTime(d)}`
  if (days === -1) return `gestern ${formatTime(d)}`
  return formatShort(d)
}

/* "12 Tage", "1 T 5 Std", "5 Std 12 Min", "12 Min" */
export function formatDuration(ms: number) {
  const abs = Math.max(0, ms)
  const days = Math.floor(abs / DAY)
  const hours = Math.floor((abs % DAY) / HOUR)
  const minutes = Math.floor((abs % HOUR) / MINUTE)
  if (days >= 2) return `${days} Tage`
  if (days === 1) return `1 T ${hours} Std`
  if (hours >= 1) return `${hours} Std ${minutes} Min`
  return `${Math.max(minutes, 1)} Min`
}

/* For "seit … offen", "in …": "3 Tagen", "1 Tag", below a day "5 Std 12 Min" */
export function dayCount(ms: number) {
  const days = Math.floor(Math.abs(ms) / DAY)
  if (days === 0) return formatDuration(Math.abs(ms))
  return days === 1 ? '1 Tag' : `${days} Tagen`
}
