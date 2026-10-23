import { useEffect, useRef } from 'react'

const VOLUME = 0.5 // overall level: half the level of the files themselves (≈ −6 dB)

/* A file, or a file with its own volume relative to the others (1 = unchanged) */
export type SoundSource = string | { src: string; volume: number }

export interface Sound {
  buffer: AudioBuffer
  volume: number
}

export interface SoundBank {
  ctx: AudioContext
  output: GainNode
  sounds: Sound[] // in the order of `sources`, failed files left out
}

const toEntry = (source: SoundSource) => (typeof source === 'string' ? { src: source, volume: 1 } : source)

/*
 * Loads `sources` into Web Audio buffers (no latency, sounds can overlap).
 * Browsers only allow audio after a user gesture: unlocking /prototypes
 * (typing the password) already counts; otherwise the first click, tap or key
 * press does.
 */
export function useSoundBank(sources: readonly SoundSource[]) {
  const bank = useRef<SoundBank | null>(null)
  // Reload only when the files or volumes change, not on every new array
  const sourcesKey = JSON.stringify(sources.map(toEntry))

  useEffect(() => {
    const ctx = new AudioContext()
    const output = new GainNode(ctx, { gain: VOLUME })
    output.connect(ctx.destination)
    const state: SoundBank = { ctx, output, sounds: [] }
    bank.current = state

    const entries: { src: string; volume: number }[] = JSON.parse(sourcesKey)
    const load = async ({ src, volume }: { src: string; volume: number }): Promise<Sound> => {
      const res = await fetch(src)
      return { buffer: await ctx.decodeAudioData(await res.arrayBuffer()), volume }
    }

    void Promise.allSettled(entries.map(load)).then((results) => {
      for (const result of results) {
        if (result.status === 'fulfilled') state.sounds.push(result.value)
        else console.error('Could not load sound', result.reason)
      }
    })

    const resume = () => {
      if (ctx.state === 'suspended') void ctx.resume()
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      bank.current = null
      void ctx.close()
    }
  }, [sourcesKey])

  return bank
}

/* Plays `sound` at `when` (AudioContext time, default now) */
export function playSound(bank: SoundBank, sound: Sound, when = 0) {
  if (bank.ctx.state === 'suspended') void bank.ctx.resume()
  const source = new AudioBufferSourceNode(bank.ctx, { buffer: sound.buffer })
  if (sound.volume === 1) {
    source.connect(bank.output)
  } else {
    source.connect(new GainNode(bank.ctx, { gain: sound.volume })).connect(bank.output)
  }
  source.start(when)
}
