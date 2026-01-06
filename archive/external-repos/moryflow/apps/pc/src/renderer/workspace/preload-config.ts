const DISABLE_KEY = 'preload:disable'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

export const preloadConfig = {
  isDisabled(): boolean {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(DISABLE_KEY) === '1'
  },
  getTtlMs(): number {
    return DEFAULT_TTL_MS
  }
}
