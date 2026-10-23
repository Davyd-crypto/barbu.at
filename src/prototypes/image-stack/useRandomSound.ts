import { useEffect, useRef } from 'react'
import { playSound, useSoundBank, type SoundSource } from './useSoundBank.ts'

/* Plays one of `sources` at random whenever `trigger` turns true, never the same one twice in a row */
export function useRandomSound(trigger: boolean, sources: readonly SoundSource[]) {
  const bank = useSoundBank(sources)
  const last = useRef(-1)

  useEffect(() => {
    const sounds = bank.current
    if (!trigger || !sounds?.sounds.length) return

    const count = sounds.sounds.length
    let index = Math.floor(Math.random() * count)
    if (count > 1 && index === last.current) index = (index + 1 + Math.floor(Math.random() * (count - 1))) % count
    last.current = index
    playSound(sounds, sounds.sounds[index])
  }, [trigger, bank])
}
