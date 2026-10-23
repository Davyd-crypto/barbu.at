import { useEffect, useState } from 'react'

/* True once `active` has stayed true for `delayMs`; false as soon as it isn't */
export function useDwell(active: boolean, delayMs: number) {
  const [dwelled, setDwelled] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setDwelled(true), delayMs)
    return () => {
      clearTimeout(timer)
      setDwelled(false)
    }
  }, [active, delayMs])

  return active && dwelled
}
