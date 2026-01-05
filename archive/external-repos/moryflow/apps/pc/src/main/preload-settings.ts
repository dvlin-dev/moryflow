import Store from 'electron-store'

type PreloadConfig = {
  disabled: boolean
  ttlMs: number
}

const store = new Store<{ preloadConfig: PreloadConfig }>({
  name: 'preload-settings',
  defaults: {
    preloadConfig: {
      disabled: false,
      ttlMs: 24 * 60 * 60 * 1000
    }
  }
})

export const getPreloadConfig = (): PreloadConfig => store.get('preloadConfig')

export const setPreloadConfig = (config: Partial<PreloadConfig>) => {
  const current = store.get('preloadConfig')
  store.set('preloadConfig', { ...current, ...config })
}
