import { create } from 'zustand'
import type { AppStateStatus } from 'react-native'

type LifecycleState = {
  appState: AppStateStatus
  isBackground: boolean
  lastChangedAt: number
}

type LifecycleActions = {
  setAppState: (state: AppStateStatus) => void
}

export type AppLifecycleStore = LifecycleState & LifecycleActions

export const useAppLifecycleStore = create<AppLifecycleStore>()((set) => ({
  appState: 'active',
  isBackground: false,
  lastChangedAt: Date.now(),
  setAppState: (state) =>
    set({ appState: state, isBackground: state !== 'active', lastChangedAt: Date.now() }),
}))

