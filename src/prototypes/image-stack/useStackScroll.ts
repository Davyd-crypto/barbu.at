import { useEffect, useState, type RefObject } from 'react'

const STEP_PX = 220 // wheel/drag distance per image
const SETTLE_MS = 140 // idle time after a gesture before snapping to an image
const SNAP_BIAS = 0.85 // snap forward once ~15% of a step has been travelled
const EASE = 0.14 // per-frame approach towards the target
const MOMENTUM_MS = 140 // how far a touch flick carries on

/*
 * Endless scroll position, driven by wheel, touch/drag and keyboard on `ref`.
 * Returns an unbounded float (0 = first image centered, negative going back)
 * that eases towards the target and always comes to rest on a whole number.
 * Snapping goes in the direction of travel, so even a single small wheel tick
 * advances. Wrapping onto the images is up to the caller.
 *
 * `resting` is true once the position has come to rest on `restIndex` (no
 * gesture or snap pending); `restIndex` keeps the last resting position.
 * `moved` turns true with the first scroll input and stays true.
 *
 * While `lockRef.current` is true the position holds still: input is still
 * collected and the stack moves on once the lock is released.
 */
export function useStackScroll(ref: RefObject<HTMLElement | null>, lockRef?: RefObject<boolean>) {
  const [position, setPosition] = useState(0)
  const [resting, setResting] = useState(true)
  const [restIndex, setRestIndex] = useState(0)
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    const el = ref.current!
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let current = 0
    let target = 0
    let origin = 0 // image index where the current gesture started
    let frame = 0
    let settleTimer = 0
    let settlePending = false

    function animate() {
      if (lockRef?.current) {
        frame = requestAnimationFrame(animate)
        return
      }
      current += (target - current) * (reducedMotion ? 1 : EASE)
      if (Math.abs(target - current) < 0.001) current = target
      setPosition(current)
      if (current !== target) {
        frame = requestAnimationFrame(animate)
        return
      }
      frame = 0
      if (!drag && !settlePending) {
        setRestIndex(current)
        setResting(true)
      }
    }

    function moveTo(value: number) {
      target = value
      // A click without movement keeps the focus instead of flickering out and back in
      if (target !== current) {
        setResting(false)
        setMoved(true)
      }
      if (!frame) frame = requestAnimationFrame(animate)
    }

    function cancelSettle() {
      clearTimeout(settleTimer)
      settlePending = false
    }

    function settle() {
      const travelled = target - origin
      if (travelled > 0) moveTo(Math.floor(target + SNAP_BIAS))
      else if (travelled < 0) moveTo(Math.ceil(target - SNAP_BIAS))
      else moveTo(Math.round(target))
      origin = target
    }

    function scheduleSettle() {
      clearTimeout(settleTimer)
      settlePending = true
      settleTimer = window.setTimeout(() => {
        settlePending = false
        settle()
      }, SETTLE_MS)
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? el.clientHeight : 1
      moveTo(target + (e.deltaY * unit) / STEP_PX)
      scheduleSettle()
    }

    let drag: { pointerId: number; y: number; start: number; lastY: number; lastTime: number; velocity: number } | null = null

    // Links and buttons (e.g. in the caption) keep their clicks and keys instead of scrolling
    const isControl = (target: EventTarget | null) =>
      target instanceof Element && target.closest('a, button, input, textarea, select') !== null

    function onPointerDown(e: PointerEvent) {
      if (!e.isPrimary || e.button !== 0 || isControl(e.target)) return
      cancelSettle()
      el.setPointerCapture(e.pointerId)
      drag = { pointerId: e.pointerId, y: e.clientY, start: target, lastY: e.clientY, lastTime: e.timeStamp, velocity: 0 }
    }

    function onPointerMove(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return
      const dt = e.timeStamp - drag.lastTime
      if (dt > 0) drag.velocity = 0.8 * ((drag.lastY - e.clientY) / dt) + 0.2 * drag.velocity
      drag.lastY = e.clientY
      drag.lastTime = e.timeStamp
      // Swiping up moves forward, like scrolling down
      moveTo(drag.start - (e.clientY - drag.y) / STEP_PX)
    }

    function onPointerUp(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return
      moveTo(target + (drag.velocity * MOMENTUM_MS) / STEP_PX)
      drag = null
      settle()
    }

    function go(delta: number) {
      cancelSettle()
      moveTo(Math.round(target) + delta)
      origin = target
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (isControl(e.target) && (e.key === ' ' || e.key === 'Enter')) return
      const actions: Record<string, () => void> = {
        ArrowDown: () => go(1),
        ArrowRight: () => go(1),
        PageDown: () => go(1),
        ' ': () => go(e.shiftKey ? -1 : 1),
        ArrowUp: () => go(-1),
        ArrowLeft: () => go(-1),
        PageUp: () => go(-1),
      }
      const action = actions[e.key]
      if (!action) return
      e.preventDefault()
      action()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(frame)
      clearTimeout(settleTimer)
    }
  }, [ref, lockRef])

  return { position, resting, restIndex, moved }
}
