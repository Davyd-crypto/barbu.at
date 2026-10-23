import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createDaemon, type Daemon, type Motion } from '../daemon.ts'
import type { Session } from '../session.ts'
import { SPRITES, type SpriteKey } from '../sprites.ts'

interface AvatarProps {
  session: Session
}

export function Avatar({ session }: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const daemonRef = useRef<Daemon | null>(null)
  const [sprite, setSprite] = useState<SpriteKey>('idle')
  const [status, setStatus] = useState('idle')
  const [motion, setMotion] = useState<Motion[]>([])

  useEffect(() => {
    const daemon = createDaemon({
      container: containerRef.current!,
      onFace: (nextSprite, nextStatus) => {
        setSprite(nextSprite)
        setStatus(nextStatus)
      },
      onMotion: setMotion,
    })
    daemonRef.current = daemon
    return () => {
      daemon.destroy()
      daemonRef.current = null
    }
  }, [])

  // Layout effect so the face switches in the same frame as the CRT animation
  useLayoutEffect(() => {
    const daemon = daemonRef.current
    if (!daemon) return
    if (session === 'shutting-down') daemon.terminate()
    else if (session === 'powering-on') daemon.reconnect()
    else if (session === 'online') daemon.online()
  }, [session])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const rows = SPRITES[sprite]
    ctx.clearRect(0, 0, 16, 16)
    ctx.fillStyle = '#000000'

    for (let y = 0; y < 16; y++) {
      const row = rows[y]
      for (let x = 0; x < 16; x++) {
        if (row[x] === '#') {
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }, [sprite])

  return (
    <div
      ref={containerRef}
      className={['avatar-wrapper', ...motion].join(' ')}
      title="Tap or interact"
      onClick={() => daemonRef.current?.tap()}
      onMouseEnter={() => daemonRef.current?.hoverStart()}
      onMouseLeave={() => daemonRef.current?.hoverEnd()}
    >
      <div className="avatar-box">
        <canvas ref={canvasRef} className="pixel-face-canvas" width={16} height={16} />
      </div>
      <div className="avatar-status">{`> ${status}`}</div>
    </div>
  )
}
