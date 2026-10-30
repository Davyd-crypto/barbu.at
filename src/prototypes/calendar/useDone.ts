/*
 * Which tasks are checked off, by UID. Kept in localStorage, so it is per
 * browser and device (there is no backend to sync it).
 */
import { useSyncExternalStore } from 'react'

const KEY = 'calendar:done'

function read(): ReadonlySet<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

let done = read()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setDone(id: string, value: boolean) {
  const next = new Set(done)
  if (value) next.add(id)
  else next.delete(id)
  done = next
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // Private mode or storage full: keep it for this session only
  }
  listeners.forEach((l) => l())
}

export function useDone() {
  return useSyncExternalStore(subscribe, () => done)
}
