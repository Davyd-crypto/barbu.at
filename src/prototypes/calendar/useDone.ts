/*
 * Which tasks are checked off. Kept in localStorage, so it is per browser and
 * device (there is no backend to sync it).
 *
 * Each check stores the task's UID plus its course and due time. Renaming an
 * entry in the .ics gives it a new UID; the check then moves to the one task
 * of that course due at the same time (never when that is ambiguous).
 */
import { useSyncExternalStore } from 'react'
import { taskById, tasks, type Task } from './model.ts'

const KEY = 'calendar:done'

export interface DoneEntry {
  id: string
  course?: string
  due?: number
}

function entryOf(task: Task): DoneEntry {
  return { id: task.id, course: task.course.id, due: task.due.getTime() }
}

/* Old format was a plain list of UIDs */
function read(): DoneEntry[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.flatMap((item: unknown): DoneEntry[] => {
      if (typeof item === 'string') return [{ id: item }]
      if (typeof item !== 'object' || item === null) return []
      const { id, course, due } = item as Record<string, unknown>
      if (typeof id !== 'string') return []
      return [{ id, course: typeof course === 'string' ? course : undefined, due: typeof due === 'number' ? due : undefined }]
    })
  } catch {
    return []
  }
}

function write(list: DoneEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Private mode or storage full: keep it for this session only
  }
}

/*
 * Points entries whose UID no longer exists at the renamed task, if exactly one
 * task of the same course is due at the same time and not checked already.
 * Entries without a match are kept unchanged, in case the entry comes back.
 */
export function resolveDone(list: DoneEntry[], all: readonly Task[]): DoneEntry[] {
  const known = new Set(all.map((t) => t.id))
  const taken = new Set(list.filter((e) => known.has(e.id)).map((e) => e.id))
  return list.map((entry) => {
    if (known.has(entry.id) || entry.course === undefined || entry.due === undefined) return entry
    const matches = all.filter((t) => t.course.id === entry.course && t.due.getTime() === entry.due && !taken.has(t.id))
    if (matches.length !== 1) return entry
    taken.add(matches[0].id)
    return entryOf(matches[0])
  })
}

let entries = read()
const resolved = resolveDone(entries, tasks)
if (resolved.some((e, i) => e !== entries[i])) write(resolved)
entries = resolved

let done: ReadonlySet<string> = new Set(entries.map((e) => e.id))
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setDone(id: string, value: boolean) {
  const task = taskById.get(id)
  entries = entries.filter((e) => e.id !== id)
  if (value) entries.push(task ? entryOf(task) : { id })
  done = new Set(entries.map((e) => e.id))
  write(entries)
  listeners.forEach((l) => l())
}

export function useDone() {
  return useSyncExternalStore(subscribe, () => done)
}
