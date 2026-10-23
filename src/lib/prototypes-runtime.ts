import type { ComponentType } from 'react'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as JsxRuntime from 'react/jsx-runtime'
import * as ReactRouter from 'react-router'
import { SHARED_MODULES } from './shared-modules.ts'
import { decrypt } from './vault.ts'

const modules: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': JsxRuntime,
  'react-dom': ReactDOM,
  'react-router': ReactRouter,
}

for (const id of SHARED_MODULES) {
  if (!(id in modules)) throw new Error(`Shared module "${id}" is not provided`)
}

interface Payload {
  js: string
  css: string
}

/* Evaluates the decrypted CommonJS bundle and returns its default export */
function evaluate({ js, css }: Payload): ComponentType {
  const module = { exports: {} as { default?: ComponentType } }
  const require = (id: string) => {
    if (!(id in modules)) throw new Error(`Prototypes bundle requires unknown module "${id}"`)
    return modules[id]
  }
  new Function('require', 'module', 'exports', js)(require, module, module.exports)

  const Component = module.exports.default
  if (typeof Component !== 'function') throw new Error('Prototypes bundle has no default export')

  if (css) {
    const style = document.createElement('style')
    style.dataset.prototypes = ''
    style.textContent = css
    document.head.append(style)
  }
  return Component
}

let encrypted: Promise<Uint8Array<ArrayBuffer>> | null = null

function fetchEncrypted() {
  encrypted ??= fetch(`${import.meta.env.BASE_URL}prototypes.bin`, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`prototypes.bin: HTTP ${res.status}`)
      return res.arrayBuffer()
    })
    .then((buffer) => new Uint8Array(buffer))
    .catch((err) => {
      encrypted = null
      throw err
    })
  return encrypted
}

/*
 * Resolves to the prototypes component, or null if the password is wrong.
 * Loaded lazily by the gate so the full shared modules stay out of the main bundle.
 */
export async function unlock(password: string): Promise<ComponentType | null> {
  const data = await fetchEncrypted()
  let plaintext: string
  try {
    plaintext = await decrypt(data, password)
  } catch {
    return null
  }
  return evaluate(JSON.parse(plaintext) as Payload)
}
