/*
 * Builds src/prototypes into a single CommonJS bundle and encrypts it with
 * PROTOTYPES_PASSWORD (env var, .env or .env.local) into dist/prototypes.bin.
 * The plaintext bundle is never written to disk.
 */
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { SHARED_MODULES } from './src/lib/shared-modules.ts'
import { encrypt } from './src/lib/vault.ts'

const MIN_PASSWORD_LENGTH = 6

function encryptBundle(password: string): Plugin {
  return {
    name: 'encrypt-prototypes',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((output) => output.type === 'chunk')
      if (chunks.length !== 1) {
        this.error(`Expected one JS chunk, got ${chunks.length}. Avoid dynamic import() in src/prototypes.`)
      }

      let css = ''
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === 'asset') {
          if (!fileName.endsWith('.css')) this.error(`Unexpected asset ${fileName} (assets must be inlined)`)
          css += typeof output.source === 'string' ? output.source : new TextDecoder().decode(output.source)
        }
        delete bundle[fileName]
      }

      const payload = JSON.stringify({ js: chunks[0].code, css })
      this.emitFile({ type: 'asset', fileName: 'prototypes.bin', source: await encrypt(payload, password) })
    },
  }
}

export default defineConfig(({ mode }) => {
  const { PROTOTYPES_PASSWORD: password = '' } = loadEnv(mode, process.cwd(), 'PROTOTYPES_')
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `PROTOTYPES_PASSWORD must be set and at least ${MIN_PASSWORD_LENGTH} characters long ` +
        '(GitHub secret in CI, .env or .env.local locally).',
    )
  }

  return {
    plugins: [react(), encryptBundle(password)],
    publicDir: false,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    // Production JSX even when built from the dev server (npm run dev:locked),
    // since the app only shares react/jsx-runtime
    oxc: { jsx: { development: false } },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      // Inline images/fonts so everything the prototypes use ends up encrypted
      assetsInlineLimit: () => true,
      lib: {
        entry: 'src/prototypes/index.tsx',
        formats: ['cjs'],
        fileName: 'prototypes',
      },
      rolldownOptions: {
        external: SHARED_MODULES,
        // Always `exports.default`, which prototypes-runtime.ts expects
        output: { exports: 'named' },
      },
    },
  }
})
