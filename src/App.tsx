import { useEffect, useRef, useState } from 'react'
import { Avatar } from './components/Avatar.tsx'
import { Footer } from './components/Footer.tsx'
import { KilledScreen } from './components/KilledScreen.tsx'
import type { Session } from './session.ts'

export default function App() {
  const [session, setSession] = useState<Session>('online')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  /* Shutdown & Reconnect logic */
  function triggerShutdown() {
    if (session !== 'online') return
    setSession('shutting-down')
    timer.current = window.setTimeout(() => setSession('killed'), 750)
  }

  function triggerReconnect() {
    if (session !== 'killed') return
    setSession('powering-on')
    timer.current = window.setTimeout(() => setSession('online'), 800)
  }

  // Keyboard support: Ctrl+C / Cmd+C / any key reconnect
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (session === 'killed') {
        triggerReconnect()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (!window.getSelection()?.toString()) {
          e.preventDefault()
          triggerShutdown()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const crtClass = session === 'shutting-down' || session === 'powering-on' ? ` ${session}` : ''

  return (
    <>
      <div className={`screen${crtClass}`}>
        <header className="top-bar">
          {'[TTY1] // 200_OK // ROOT_SESSION'}
        </header>

        <div className="content-container">
          <main>
            <div className="prompt">guest@db:~# whoami</div>
            <h1>David Barbu</h1>
            <p className="subtitle">
              Frontend-heavy Engineer with full-stack instincts &amp; years of shipping production code.<span className="cursor"></span>
            </p>
          </main>

          <Avatar session={session} />
        </div>

        <Footer onExit={triggerShutdown} />
      </div>

      {session === 'killed' && <KilledScreen onReconnect={triggerReconnect} />}
    </>
  )
}
