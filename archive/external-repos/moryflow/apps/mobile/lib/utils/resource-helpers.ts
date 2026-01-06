import type { ResourceManager } from '@/lib/utils/resource-manager'
import { AppState, type AppStateStatus } from 'react-native'

export function withTimer(manager: ResourceManager, fn: () => void, delay: number) {
  return manager.registerTimer(fn, delay)
}

export function withAppStateChange(
  manager: ResourceManager,
  handler: (status: AppStateStatus) => void
) {
  const sub = AppState.addEventListener('change', handler)
  return manager.registerSubscription({ remove: () => sub.remove() })
}
