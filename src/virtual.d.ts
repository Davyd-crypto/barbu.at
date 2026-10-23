/* Provided by the prototypes-dev plugin in vite.config.ts */
declare module 'virtual:prototypes-dev' {
  import type { ComponentType } from 'react'

  /* Loads src/prototypes directly during `vite dev`; null in production builds */
  const loadPrototypes: (() => Promise<{ default: ComponentType }>) | null
  export default loadPrototypes
}
