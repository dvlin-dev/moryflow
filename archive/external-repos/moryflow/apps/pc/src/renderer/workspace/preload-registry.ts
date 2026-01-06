import { preloadConfig } from './preload-config'
let cacheSnapshot: Record<string, { key: string; loadedAt: number; hash?: string; appVersion?: string }> | null = null
let appVersion: string | null = null

type Entry = {
  module: unknown
  loadedAt: number
  hash?: string
}

const registry = new Map<string, Entry>()

export const preloadRegistry = {
  set(key: string, module: unknown, hash?: string) {
    registry.set(key, { module, loadedAt: Date.now(), hash })
    void this.ensureAppVersion().then((version) => {
      void window.desktopAPI.preload.setCache({
        key,
        loadedAt: Date.now(),
        hash,
        appVersion: version ?? undefined
      })
    })
  },
  get(key: string) {
    return registry.get(key)?.module
  },
  getMeta() {
    return Array.from(registry.entries()).map(([key, entry]) => ({
      key,
      loadedAt: entry.loadedAt,
      hash: entry.hash
    }))
  },
  async hydrateCache() {
    if (cacheSnapshot) {
      return cacheSnapshot
    }
    cacheSnapshot = await window.desktopAPI.preload.getCache()
    return cacheSnapshot
  },
  async ensureAppVersion() {
    if (appVersion) return appVersion
    try {
      appVersion = await window.desktopAPI.getAppVersion()
    } catch {
      appVersion = null
    }
    return appVersion
  },
  async shouldPrefetch(key: string, currentHash?: string) {
    if (preloadConfig.isDisabled()) return false
    const cache = cacheSnapshot ?? (await this.hydrateCache())
    const entry = cache?.[key]
    const version = await this.ensureAppVersion()
    if (!entry) return true
    if (entry.appVersion && version && entry.appVersion !== version) {
      return true
    }
    const storedHash = entry.hash
    if (storedHash && typeof storedHash === 'string') {
      if (currentHash && currentHash !== storedHash) {
        return true
      }
      return false
    }
    return Date.now() - entry.loadedAt > preloadConfig.getTtlMs()
  }
}
