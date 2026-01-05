import type { DesktopApi } from '../shared/ipc.js'

declare global {
  interface Window {
    desktopAPI: DesktopApi
  }
}

export {}
