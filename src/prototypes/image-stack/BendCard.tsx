import type { CSSProperties } from 'react'

const STRIPS = 15 // odd, so there is a center strip
const CENTER = (STRIPS - 1) / 2

interface BendCardProps {
  src: string
  card: number // drawn card width in px
  bend: number // total curvature across the image in degrees
  style: CSSProperties // the card transform (same as the flat .stack-card)
}

interface Strip {
  x: number // strip center, relative to the card center (px)
  z: number
  angle: number // rotateY in degrees
}

/*
 * Lays the strips edge to edge along an arc: each one turns `hinge` degrees
 * further than its left neighbour, so the right side leads and the left lags.
 * Positions are computed here (flat siblings) instead of nesting the strips,
 * which keeps the 3D scene simple for the browser.
 */
function layout(width: number, hinge: number): Strip[] {
  const strips: Strip[] = new Array(STRIPS)
  strips[CENTER] = { x: 0, z: 0, angle: 0 }

  for (const side of [1, -1]) {
    // Shared edge with the previous strip, starting at the center strip's edge
    let edgeX = (side * width) / 2
    let edgeZ = 0
    for (let step = 1; step <= CENTER; step++) {
      const angle = side * step * hinge
      const rad = (angle * Math.PI) / 180
      // CSS rotateY(a) maps (x, 0, 0) to (x·cos a, 0, −x·sin a)
      const dx = side * width * Math.cos(rad)
      const dz = -side * width * Math.sin(rad)
      strips[CENTER + side * step] = { x: edgeX + dx / 2, z: edgeZ + dz / 2, angle }
      edgeX += dx
      edgeZ += dz
    }
  }
  return strips
}

/* The focused image cut into vertical strips so it can curve in 3D (a single element always stays flat) */
export function BendCard({ src, card, bend, style }: BendCardProps) {
  const width = card / STRIPS
  const strips = layout(width, bend / (STRIPS - 1))

  return (
    <div className="stack-card bend-card" style={style} aria-hidden>
      {strips.map(({ x, z, angle }, index) => (
        <div
          key={index}
          className="bend-strip"
          style={{
            width: width + 0.5, // half a pixel of overlap hides seams
            left: card / 2 - width / 2,
            transform: `translate3d(${x}px, 0, ${z}px) rotateY(${angle}deg)`,
            backgroundImage: `url("${src}")`,
            backgroundSize: `${card}px 100%`,
            backgroundPosition: `${-index * width}px 0`,
          }}
        />
      ))}
    </div>
  )
}
