import { preloadRegistry } from './preload-registry'

export type ChunkDef = {
  key: string
  loader: () => Promise<unknown>
  hash?: string
  disabled?: boolean
}

export const preloadChunks = async (defs: ChunkDef[]) => {
  const tasks = defs.map(async (def) => {
    if (def.disabled) return
    const need = await preloadRegistry.shouldPrefetch(def.key, def.hash)
    if (!need) return
    try {
      const mod = await def.loader()
      preloadRegistry.set(def.key, mod, def.hash)
    } catch (error) {
      console.warn(`[preload] failed for ${def.key}`, error)
    }
  })
  await Promise.all(tasks)
}
