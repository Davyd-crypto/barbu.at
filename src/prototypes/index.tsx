/*
 * Entry of the password-protected area under /prototypes.
 * Built separately (vite.prototypes.config.ts) and shipped only encrypted.
 * Register new prototypes in PROTOTYPES below.
 */
import type { ComponentType } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { ExamplePrototype } from './example/ExamplePrototype.tsx'
import { ImageStackPrototype } from './image-stack/ImageStackPrototype.tsx'
import './prototypes.css'

interface Prototype {
  path: string
  title: string
  description: string
  Component: ComponentType
}

const PROTOTYPES: Prototype[] = [
  {
    path: 'example',
    title: 'example',
    description: 'Placeholder to check that the encrypted bundle works.',
    Component: ExamplePrototype,
  },
  {
    path: 'image-stack',
    title: 'image-stack',
    description: 'Isometric photo stack, scroll through 30 images.',
    Component: ImageStackPrototype,
  },
]

function PrototypeIndex() {
  return (
    <div className="screen">
      <header className="top-bar">
        {'[TTY1] // 200_OK // PROTOTYPES'}
      </header>

      <main className="proto-index">
        <div className="prompt">guest@db:~/prototypes# ls</div>
        <h1>Prototypes</h1>
        <ul className="proto-list">
          {PROTOTYPES.map((p) => (
            <li key={p.path}>
              <Link to={p.path}>{p.title}/</Link>
              <span>{p.description}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer>
        <nav className="links">
          <Link to="/">cd ~</Link>
        </nav>
      </footer>
    </div>
  )
}

export default function Prototypes() {
  return (
    <Routes>
      <Route index element={<PrototypeIndex />} />
      {PROTOTYPES.map(({ path, Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
      <Route path="*" element={<Navigate to="/prototypes" replace />} />
    </Routes>
  )
}
