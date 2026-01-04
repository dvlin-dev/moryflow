import Store from 'electron-store'

type CacheEntry = {
  key: string
  loadedAt: number
  hash?: string
  appVersion?: string
}

const store = new Store<{ preloadCache: Record<string, CacheEntry> }>({
  name: 'preload-cache',
  defaults: {
    preloadCache: {}
  }
})

export const getPreloadCache = (key: string) => {
  const cache = store.get('preloadCache') ?? {}
  return cache[key]
}

export const setPreloadCache = (key: string, entry: CacheEntry) => {
  const cache = { ...(store.get('preloadCache') ?? {}) }
  cache[key] = entry
  store.set('preloadCache', cache)
}

export const getAllPreloadCache = () => store.get('preloadCache') ?? {}
