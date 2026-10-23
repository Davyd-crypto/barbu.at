import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BendCard } from './BendCard.tsx'
import { Caption } from './Caption.tsx'
import { IMAGE_ASPECT, IMAGE_COUNT, randomTitle, stackImages } from './images.ts'
import { SoundHint } from './SoundHint.tsx'
import clickSound from './sounds/click.mp3'
import flipSound2 from './sounds/flip2.mp3'
import flipSound3 from './sounds/flip3.mp3'
import { useDwell } from './useDwell.ts'
import { useEased } from './useEased.ts'
import { usePreload } from './usePreload.ts'
import { useRandomSound } from './useRandomSound.ts'
import { useStackScroll } from './useStackScroll.ts'
import { useTickSound } from './useTickSound.ts'
import './image-stack.css'

// Relative volume of the louder recordings: 60% quieter
const QUIETER = 0.4

// One of these, at random, when the focus animation starts
const FOCUS_SOUNDS = [
  { src: flipSound2, volume: QUIETER },
  { src: flipSound3, volume: QUIETER },
]
// Whenever an image leaves the center (flip1/4/5 are in sounds/ to swap in, with pick 'random')
const TICK_SOUNDS = [{ src: clickSound, volume: QUIETER }]
const TICK_PICK = 'random'

const GAP = 1.35 // distance between the centered image and each stack, in card widths
const SPACING = 0.04 // distance between stacked images, in card widths
const TILT_X = -32 // world rotation in degrees (orthographic isometric view)
const TILT_Y = -45

// Focus: once the stack has rested on an image for FOCUS_DELAY_MS, the stacks
// make room and blur, the image turns to face the viewer flat (2D) and zooms
// in. When scrolling on, the stack waits until that has been reversed.
// Sizes and distances below are in base card widths (cardWidth()); the images
// outside the focus are always drawn smaller than that, at STACK_SCALE.
const STACK_SCALE = 0.75
const FOCUS_GAP = 0.5 // extra distance the stacks move outwards
const FOCUS_ZOOM = 0.8 // focused image ends up 80% larger than a base card
const FOCUS_BLUR_PX = 4 // blur of the stacks behind the focused image
const FOCUS_IN_MS = 800 // turning flat and zooming in
const FOCUS_OUT_MS = 400 // turning back; the stack waits for this before it scrolls on
const FOCUS_BEND_DEG = 40 // how far the image curves mid-turn (right side leads, left lags)
const CAPTION_RISE_PX = 12 // the caption slides up this far while fading in
const CAPTION_INSET = 0.23 // caption starts this far into the image width, from the left
const LOADER_FADE_MS = 600
const FOCUS_DELAY_MS = 600

const rad = (deg: number) => (deg * Math.PI) / 180

/* On-screen length of one card width along the stack axis, and that axis' direction */
const AXIS_SCALE = Math.hypot(Math.sin(rad(TILT_Y)), Math.cos(rad(TILT_Y)) * Math.sin(rad(TILT_X)))
const AXIS_X = Math.abs(Math.sin(rad(TILT_Y))) / AXIS_SCALE
const AXIS_Y = Math.abs(Math.cos(rad(TILT_Y)) * Math.sin(rad(TILT_X))) / AXIS_SCALE

function cardWidth(viewportWidth: number) {
  return Math.min(Math.max(150, viewportWidth * 0.24), 460)
}

const LOAD_STEP_PX = 200 // load sizes in steps, so small resizes don't reload every image
const MAX_LOAD_PX = 2400

/* Pixel width to load: the focused (largest) display size on this screen */
function loadWidth(viewportWidth: number) {
  const focusedWidth = cardWidth(viewportWidth) * (1 + FOCUS_ZOOM)
  const pixels = focusedWidth * Math.min(window.devicePixelRatio || 1, 2)
  return Math.min(Math.ceil(pixels / LOAD_STEP_PX) * LOAD_STEP_PX, MAX_LOAD_PX)
}

/*
 * Images per stack so that both stacks run past the window edges, also in the
 * worst case of the smallest gap (unfocused). `card` is the drawn card width.
 */
function stackLength(width: number, height: number, card: number) {
  const edge = Math.min(width / 2 / AXIS_X, height / 2 / AXIS_Y) // px from center to the edge along the axis
  const depthNeeded = (edge + card) / (AXIS_SCALE * card) // one extra card so the last is fully outside
  return Math.ceil((depthNeeded - GAP / STACK_SCALE) / SPACING) + 1
}

/*
 * Depth of an image relative to the scroll position (offset 0 = centered):
 * upcoming images wait in the far stack (top right), pass through the center
 * and end up in the near stack (bottom left). `gap` widens while focused.
 */
function depth(offset: number, gap: number) {
  if (offset >= 1) return -(gap + (offset - 1) * SPACING)
  if (offset <= -1) return gap + (-offset - 1) * SPACING
  return -offset * gap
}

function useViewport() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export function ImageStackPrototype() {
  const pageRef = useRef<HTMLDivElement>(null)
  const lockRef = useRef(true)
  const { width, height } = useViewport()
  const load = loadWidth(width)
  const images = useMemo(() => stackImages(load), [load])

  // Loader until every image is downloaded and decoded, then the stack fades in
  const { progress, ready, infos } = usePreload(images)
  const appear = useEased(ready ? 1 : 0, LOADER_FADE_MS)

  const { position, resting, restIndex } = useStackScroll(pageRef, lockRef)
  useTickSound(position, TICK_SOUNDS, TICK_PICK)
  const focused = useDwell(resting && ready, FOCUS_DELAY_MS)
  useRandomSound(focused, FOCUS_SOUNDS)
  const focus = useEased(focused ? 1 : 0, focused ? FOCUS_IN_MS : FOCUS_OUT_MS) // 0 = isometric, 1 = focused
  // In drawn card widths, so the smaller images keep the same on-screen distance
  const gap = (GAP + focus * FOCUS_GAP) / STACK_SCALE

  // Hold the stack while loading and while the focused image is still turning back
  useEffect(() => {
    lockRef.current = !ready || focus > 0
  }, [ready, focus])

  const card = cardWidth(width) * STACK_SCALE // drawn width of every image outside the focus
  const perStack = stackLength(width, height, card)

  // Endless loop: render a window of slots around the position, each showing
  // images[slot mod count]. Slots enter and leave beyond the window edges.
  const base = Math.floor(position)
  const centered = Math.round(position)
  const stacks = []
  let focusedCard = null
  for (let slot = base - perStack; slot <= base + perStack + 1; slot++) {
    const image = images[((slot % IMAGE_COUNT) + IMAGE_COUNT) % IMAGE_COUNT]
    const isFocused = slot === restIndex && focus > 0
    const style: Record<string, string | number> = { '--z': depth(slot - position, gap) }
    if (isFocused) {
      // Undo the world tilt (in reverse order) so the image faces the viewer flat
      style['--turn-y'] = `${-TILT_Y * focus}deg`
      style['--turn-x'] = `${-TILT_X * focus}deg`
      style['--zoom'] = 1 + ((1 + FOCUS_ZOOM) / STACK_SCALE - 1) * focus
    }
    // While turning, the focused image bends: most in the middle of the animation, flat at both ends
    const bend = isFocused ? FOCUS_BEND_DEG * Math.sin(Math.PI * focus) : 0
    const element =
      bend > 0.5 ? (
        <BendCard key={slot} src={image.src} card={card} bend={bend} style={style as CSSProperties} />
      ) : (
        <img
          key={slot}
          className="stack-card"
          src={image.src}
          alt={image.alt}
          aria-hidden={slot !== centered}
          draggable={false}
          decoding="async"
          referrerPolicy="no-referrer" // don't tell picsum.photos which page loads the images
          style={style as CSSProperties}
        />
      )
    if (isFocused) focusedCard = element
    else stacks.push(element)
  }

  const world = { transform: `rotateX(${TILT_X}deg) rotateY(${TILT_Y}deg)` }

  // Caption below the focused image: made-up title + the real photographer
  const focusedIndex = ((restIndex % IMAGE_COUNT) + IMAGE_COUNT) % IMAGE_COUNT
  const info = infos[focusedIndex]
  const focusedWidth = cardWidth(width) * (1 + FOCUS_ZOOM)
  const focusedHeight = focusedWidth / IMAGE_ASPECT

  return (
    <div ref={pageRef} className="stack-page" style={{ '--card-w': `${card}px` } as CSSProperties}>
      {/* The bend strips load the photos as CSS backgrounds, which can't set a referrer policy per element */}
      <meta name="referrer" content="no-referrer" />
      <SoundHint style={{ opacity: appear }} />
      {ready && (
        <>
          {/* The stacks blur as a whole; the focused image sits sharp on its own layer above */}
          <div
            className="stack-layer"
            style={{ opacity: appear, filter: focus > 0 ? `blur(${FOCUS_BLUR_PX * focus}px)` : undefined }}
          >
            <div className="stack-world" style={world}>
              {stacks}
            </div>
          </div>
          {focusedCard && (
            <div className="stack-layer">
              <div className="stack-world" style={world}>
                {focusedCard}
              </div>
            </div>
          )}
          {focus > 0 && (
            <Caption
              title={randomTitle(focusedIndex)}
              author={info?.author}
              photoUrl={info?.url}
              src={images[focusedIndex].src}
              style={{
                top: `calc(50% + ${focusedHeight / 2}px)`,
                left: `calc(50% + ${focusedWidth * (CAPTION_INSET - 0.5)}px)`,
                opacity: focus,
                transform: `translateY(${(1 - focus) * CAPTION_RISE_PX}px)`,
                // Clickable only once the image is fully in focus
                pointerEvents: focus === 1 ? undefined : 'none',
              }}
            />
          )}
        </>
      )}

      {appear < 1 && (
        <div className="stack-loader" role="progressbar" aria-valuenow={Math.round(progress * 100)} style={{ opacity: 1 - appear }}>
          <div className="stack-loader-bar">
            <div className="stack-loader-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="stack-loader-label">Loading {Math.round(progress * 100)}%</div>
        </div>
      )}
    </div>
  )
}
