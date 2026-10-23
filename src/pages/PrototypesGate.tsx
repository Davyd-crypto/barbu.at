import { useEffect, useState, type ComponentType, type FormEvent } from 'react'
import { Link } from 'react-router'
import loadDevPrototypes from 'virtual:prototypes-dev'

type GateState =
  | { status: 'locked' | 'verifying' | 'denied' | 'error' }
  | { status: 'unlocked'; Prototypes: ComponentType }

/* Kept for the lifetime of the page so navigating away and back stays unlocked */
let unlocked: ComponentType | null = null

function initialState(): GateState {
  return unlocked ? { status: 'unlocked', Prototypes: unlocked } : { status: 'locked' }
}

export function PrototypesGate() {
  const [state, setState] = useState<GateState>(initialState)
  const [password, setPassword] = useState('')

  // `npm run dev` has no encrypted bundle: load the source directly
  useEffect(() => {
    if (!loadDevPrototypes || state.status === 'unlocked') return
    loadDevPrototypes().then((mod) => setState({ status: 'unlocked', Prototypes: mod.default }))
  }, [state.status])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!password || state.status === 'verifying') return
    setState({ status: 'verifying' })
    try {
      const { unlock } = await import('../lib/prototypes-runtime.ts')
      unlocked = await unlock(password)
      setState(unlocked ? { status: 'unlocked', Prototypes: unlocked } : { status: 'denied' })
    } catch (err) {
      console.error(err)
      setState({ status: 'error' })
    }
    setPassword('')
  }

  if (state.status === 'unlocked') {
    const { Prototypes } = state
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <Prototypes />
      </>
    )
  }

  const message = {
    locked: '',
    verifying: '> verifying...',
    denied: 'Sorry, try again.',
    error: '> error: could not load /prototypes',
  }[state.status]

  return (
    <div className="screen">
      <title>Restricted</title>
      <meta name="robots" content="noindex, nofollow" />

      <header className="top-bar">
        {'[TTY1] // 401_UNAUTHORIZED // RESTRICTED'}
      </header>

      <main className="gate">
        <div className="prompt">guest@db:~# sudo ls /prototypes</div>
        <h1>Restricted</h1>

        <form className="gate-form" onSubmit={handleSubmit}>
          <input type="text" name="username" value="guest" autoComplete="username" hidden readOnly />
          <label className="gate-label" htmlFor="gate-password">[sudo] password for guest:</label>
          <div className="gate-row">
            <input
              id="gate-password"
              className="gate-input"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={state.status === 'verifying'}
            />
            <button className="exit-btn" type="submit" disabled={state.status === 'verifying'}>
              [ENTER]
            </button>
          </div>
        </form>

        <p className="gate-status" role="status">{message}</p>
      </main>

      <footer>
        <nav className="links">
          <Link to="/">cd ~</Link>
        </nav>
      </footer>
    </div>
  )
}
