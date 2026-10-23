import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { build, defineConfig, type Plugin, type Rolldown } from 'vite'

const PROTOTYPES_DEV_ID = 'virtual:prototypes-dev'
const LOCKED_MODE = 'locked'

/*
 * `virtual:prototypes-dev` imports src/prototypes directly during `vite dev`
 * and is `null` in builds, so the protected source never reaches the public
 * bundle (it is built and encrypted by vite.prototypes.config.ts instead).
 *
 * `vite --mode locked` (npm run dev:locked) keeps the password gate in dev:
 * /prototypes.bin is built and encrypted on every request.
 */
function prototypesDev(): Plugin {
  let loadDirectly = false
  let root = process.cwd()
  return {
    name: 'prototypes-dev',
    config(_config, { command, mode }) {
      loadDirectly = command === 'serve' && mode !== LOCKED_MODE
    },
    configResolved(config) {
      root = config.root
    },
    resolveId(source) {
      if (source === PROTOTYPES_DEV_ID) return `\0${PROTOTYPES_DEV_ID}`
    },
    load(id) {
      if (id !== `\0${PROTOTYPES_DEV_ID}`) return
      return loadDirectly
        ? `export default () => import('/src/prototypes/index.tsx')`
        : 'export default null'
    },
    configureServer(server) {
      if (server.config.mode !== LOCKED_MODE) return
      server.config.logger.info('  locked mode: /prototypes asks for PROTOTYPES_PASSWORD')

      server.middlewares.use('/prototypes.bin', async (_req, res) => {
        try {
          const result = await build({
            configFile: resolve(root, 'vite.prototypes.config.ts'),
            mode: 'production',
            logLevel: 'warn',
            build: { write: false },
          })
          const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[]
          const file = outputs.flatMap((o) => o.output).find((f) => f.fileName === 'prototypes.bin')
          if (!file || file.type !== 'asset') throw new Error('prototypes.bin was not emitted')
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Cache-Control', 'no-store')
          res.end(file.source)
        } catch (err) {
          server.config.logger.error(String(err instanceof Error ? err.message : err))
          res.statusCode = 500
          res.end()
        }
      })
    },
  }
}

/* GitHub Pages has no SPA rewrites: serve index.html for /prototypes and unknown paths */
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html')
      copyFileSync(index, resolve(outDir, '404.html'))
      mkdirSync(resolve(outDir, 'prototypes'), { recursive: true })
      copyFileSync(index, resolve(outDir, 'prototypes/index.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prototypesDev(), spaFallback()],
})
