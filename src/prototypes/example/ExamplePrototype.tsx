import { useState } from 'react'
import { Link } from 'react-router'

export function ExamplePrototype() {
  const [count, setCount] = useState(0)

  return (
    <div className="screen">
      <header className="top-bar">
        {'[TTY1] // 200_OK // PROTOTYPES/EXAMPLE'}
      </header>

      <main>
        <div className="prompt">guest@db:~/prototypes# ./example</div>
        <h1>Example</h1>
        <p className="subtitle">If you can read this, decryption worked.</p>
        <button className="exit-btn proto-counter" onClick={() => setCount((c) => c + 1)}>
          [COUNT: {count}]
        </button>
      </main>

      <footer>
        <nav className="links">
          <Link to="..">cd ..</Link>
        </nav>
      </footer>
    </div>
  )
}
