import { useEffect, useRef } from 'react'
import { playSound, useSoundBank, type SoundSource } from './useSoundBank.ts'

const INTERVAL_S = 0.025 // spacing when several images leave within one frame
const DEPARTURE = 0.05 // an image has left the center once the stack moved this far (in images)

/*
 * Number of images that left the center while the scroll position moved from
 * `from` to `to`. Image k leaves at k + DEPARTURE going forward and at
 * k - DEPARTURE going backward; coming back into the center plays nothing.
 */
function departures(from: number, to: number) {
  if (to > from) return Math.floor(to - DEPARTURE) - Math.floor(from - DEPARTURE)
  return Math.ceil(from + DEPARTURE) - Math.ceil(to + DEPARTURE)
}

/*
 * Plays a tick whenever an image leaves the center (passing several at once
 * plays one tick each, spaced like a ratchet). A tick is all `sources` at the
 * same time, or with `pick: 'random'` one of them, never the same twice in a row.
 */
export function useTickSound(position: number, sources: readonly SoundSource[], pick: 'all' | 'random' = 'all') {
  const bank = useSoundBank(sources)
  const previous = useRef(position)
  const next = useRef(0) // earliest time for the next tick
  const last = useRef(-1)

  useEffect(() => {
    const steps = departures(previous.current, position)
    previous.current = position

    const sounds = bank.current
    if (!steps || !sounds?.sounds.length) return

    const count = sounds.sounds.length
    for (let i = 0; i < steps; i++) {
      const when = Math.max(sounds.ctx.currentTime, next.current)
      next.current = when + INTERVAL_S
      if (pick === 'all') {
        for (const sound of sounds.sounds) playSound(sounds, sound, when)
        continue
      }
      let index = Math.floor(Math.random() * count)
      if (count > 1 && index === last.current) index = (index + 1 + Math.floor(Math.random() * (count - 1))) % count
      last.current = index
      playSound(sounds, sounds.sounds[index], when)
    }
  }, [position, bank, pick])
}
