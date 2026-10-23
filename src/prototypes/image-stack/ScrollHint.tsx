import type { CSSProperties } from 'react'

/* Hand swiping up next to an arrow (touch screens) */
function SwipeIcon() {
  return (
    <svg className="scroll-hint-icon scroll-hint-swipe" viewBox="0 0 48 44" aria-hidden>
      <path className="scroll-hint-pulse" d="M5 34V8M1 12l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        className="scroll-hint-hand"
        d="M23 6a3 3 0 0 1 6 0v12a2.5 2.5 0 0 1 5 0v1a2.5 2.5 0 0 1 5 0v10c0 6-4 10-10 10h-1c-4 0-6-2-8-5l-4-6a2.3 2.3 0 0 1 3.5-3l3.5 2.5z"
        fill="#ededeb"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Mouse with a rolling wheel and arrows pointing down (pointer devices) */
function WheelIcon() {
  return (
    <svg className="scroll-hint-icon scroll-hint-mouse" viewBox="0 0 24 44" aria-hidden>
      <rect x="3" y="1" width="18" height="28" rx="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect className="scroll-hint-wheel" x="11" y="6" width="2" height="6" rx="1" fill="currentColor" />
      <path className="scroll-hint-pulse" d="M7 33l5 4 5-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path className="scroll-hint-pulse scroll-hint-pulse-late" d="M7 38l5 4 5-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/* One-time intro that shows how to move through the stack */
export function ScrollHint({ touch, style }: { touch: boolean; style?: CSSProperties }) {
  return (
    <div className="scroll-hint" style={style} role="note">
      {touch ? <SwipeIcon /> : <WheelIcon />}
      <div className="scroll-hint-label">{touch ? 'swipe up' : 'scroll'}</div>
    </div>
  )
}
