import { useEffect, useRef, useState } from 'react'

/* Cubic ease-in-out */
export function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/*
 * Animates towards `target` with ease-in-out over `durationMs` (scaled by the
 * remaining distance, so an interrupted animation reverses from where it is).
 * Starts at `initial`, so passing a different `target` animates on mount.
 */
export function useEased(target: number, durationMs: number, initial = target) {
  const [value, setValue] = useState(initial)
  const valueRef = useRef(initial)

  useEffect(() => {
    const from = valueRef.current
    if (from === target) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reducedMotion ? 0 : durationMs * Math.abs(target - from)
    const start = performance.now()

    let frame = requestAnimationFrame(function tick(now) {
      const progress = duration ? Math.min((now - start) / duration, 1) : 1
      valueRef.current = from + (target - from) * easeInOut(progress)
      setValue(valueRef.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
