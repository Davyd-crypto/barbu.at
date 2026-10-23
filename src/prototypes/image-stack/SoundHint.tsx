import type { CSSProperties } from 'react'

/* Top-left note that the prototype is meant to be heard */
export function SoundHint({ style }: { style?: CSSProperties }) {
  return (
    <div className="stack-sound-hint" style={style}>
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
        <path className="stack-sound-wave" d="M10.5 6a2.5 2.5 0 0 1 0 4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path className="stack-sound-wave stack-sound-wave-outer" d="M12.5 4a5 5 0 0 1 0 8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      best with sound on
    </div>
  )
}
