import type { SpriteKey } from './sprites.ts'

export type Motion = 'bobbing' | 'shiver'

interface DaemonOptions {
  container: HTMLElement
  onFace: (sprite: SpriteKey, status: string) => void
  onMotion: (motion: Motion[]) => void
}

export type Daemon = ReturnType<typeof createDaemon>

/*
 * Behaviour engine of the pixel avatar: idle routines, pointer tracking and
 * tap reactions. Framework-free; the Avatar component renders what it emits.
 */
export function createDaemon({ container, onFace, onMotion }: DaemonOptions) {
  let currentSprite: SpriteKey = 'idle'
  let isBusy = false
  let isTerminating = false
  let tapCount = 0
  let moveThrottle = false
  let sequenceTimeout: number | undefined
  const motion = new Set<Motion>()
  const timers = new Set<number>()

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
    return id
  }

  function cancel(id: number | undefined) {
    if (id === undefined) return
    clearTimeout(id)
    timers.delete(id)
  }

  function cancelAll() {
    timers.forEach((id) => clearTimeout(id))
    timers.clear()
  }

  function setFaceState(spriteKey: SpriteKey, statusText: string) {
    currentSprite = spriteKey
    onFace(spriteKey, statusText)
  }

  function addMotion(m: Motion) {
    motion.add(m)
    onMotion([...motion])
  }

  function resetToIdle() {
    if (isTerminating) return
    motion.clear()
    onMotion([])
    isBusy = false
    setFaceState('idle', 'idle')
  }

  /* Routine Engine */
  function runRoutineEngine() {
    if (isTerminating) return

    const routineDelay = Math.floor(Math.random() * 2600) + 1800

    later(() => {
      if (!isBusy && !isTerminating) {
        executeRandomBehaviors()
      }
      runRoutineEngine()
    }, routineDelay)
  }

  function executeRandomBehaviors() {
    const roll = Math.random()

    if (roll < 0.35) {
      setFaceState('blink', 'blink')
      later(() => {
        setFaceState('idle', 'idle')
        if (Math.random() > 0.6) {
          later(() => {
            setFaceState('blink', 'blink')
            later(resetToIdle, 110)
          }, 90)
        }
      }, 110)
    } else if (roll < 0.50) {
      setFaceState('wink', 'wink ;)')
      later(resetToIdle, 400)
    } else if (roll < 0.75) {
      const glances: { s: SpriteKey; l: string }[] = [
        { s: 'look_left', l: 'scan_l' },
        { s: 'look_right', l: 'scan_r' },
        { s: 'look_up', l: 'daydream' },
        { s: 'look_down', l: 'inspect' },
        { s: 'side_eye', l: 'side_eye' },
      ]
      const g = glances[Math.floor(Math.random() * glances.length)]
      setFaceState(g.s, g.l)
      later(() => {
        if (Math.random() > 0.5) {
          const alt = g.s === 'look_left' ? 'look_right' : 'look_left'
          setFaceState(alt, 'scan_opp')
          later(resetToIdle, 450)
        } else {
          resetToIdle()
        }
      }, 650)
    } else if (roll < 0.90) {
      setFaceState('thinking', 'computing')
      later(() => {
        if (Math.random() > 0.5) {
          setFaceState('noticed', 'idea!')
          addMotion('bobbing')
          later(resetToIdle, 600)
        } else {
          resetToIdle()
        }
      }, 850)
    } else {
      setFaceState('sleepy', 'yawn')
      later(() => {
        setFaceState('blink', 'drowsy')
        later(resetToIdle, 400)
      }, 800)
    }
  }

  /* Pointer Tracking */
  function onMouseMove(e: MouseEvent) {
    if (isBusy || isTerminating || moveThrottle) return
    moveThrottle = true
    window.setTimeout(() => { moveThrottle = false }, 70)

    const rect = container.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)

    if (dist < 420) {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -70) setFaceState('look_left', 'watching_l')
        else if (dx > 70) setFaceState('look_right', 'watching_r')
      } else {
        if (dy < -70) setFaceState('look_up', 'watching_u')
        else if (dy > 70) setFaceState('look_down', 'watching_d')
      }
    } else {
      if (['look_left', 'look_right', 'look_up', 'look_down'].includes(currentSprite)) {
        resetToIdle()
      }
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  setFaceState('idle', 'idle')
  runRoutineEngine()

  return {
    /* Touch & Click Interaction */
    tap() {
      if (isTerminating) return
      isBusy = true
      cancel(sequenceTimeout)
      tapCount++

      if (tapCount % 3 === 1) {
        setFaceState('noticed', 'poke!')
        addMotion('bobbing')
      } else if (tapCount % 3 === 2) {
        setFaceState('gasp', 'woah!')
        addMotion('shiver')
      } else {
        setFaceState('cheer', 'yay!')
        addMotion('bobbing')
      }

      sequenceTimeout = later(resetToIdle, 1000)
    },

    hoverStart() {
      if (isTerminating) return
      isBusy = true
      cancel(sequenceTimeout)
      setFaceState('cheer', 'happy_hello')
      addMotion('bobbing')
    },

    hoverEnd() {
      if (isTerminating) return
      cancel(sequenceTimeout)
      resetToIdle()
    },

    /* Session hooks: ^C, reconnect, back online */
    terminate() {
      isTerminating = true
      cancelAll()
      setFaceState('dead', 'killed')
    },

    reconnect() {
      setFaceState('cheer', 'online')
    },

    online() {
      if (!isTerminating) return
      isTerminating = false
      resetToIdle()
      runRoutineEngine()
    },

    destroy() {
      cancelAll()
      window.removeEventListener('mousemove', onMouseMove)
    },
  }
}
