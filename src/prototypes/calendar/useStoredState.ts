import { useState } from 'react'

/* useState that remembers its value in localStorage (a per-device convenience) */
export function useStoredState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return allowed.find((v) => v === stored) ?? initial
    } catch {
      return initial
    }
  })

  function set(next: T) {
    setValue(next)
    try {
      localStorage.setItem(key, next)
    } catch {
      // Not persisted, fine
    }
  }

  return [value, set] as const
}
