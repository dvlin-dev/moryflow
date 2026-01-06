import { useEffect } from 'react'
import { useResourceManager } from '@/lib/hooks/use-resource-manager'
import { withAppStateChange } from '@/lib/utils/resource-helpers'
import { useAppLifecycleStore } from '@/lib/stores/app-lifecycle.store'
import type { AppStateStatus } from 'react-native'

/**
 * 监听 AppState（前后台切换）
 * 注意：进入后台不主动关闭流（按你的要求）。
 * 仅更新状态，预留降级轮询/节流等策略的扩展点。
 */
export function useAppLifecycle() {
  const manager = useResourceManager()
  const setAppState = useAppLifecycleStore((s) => s.setAppState)

  useEffect(() => {
    withAppStateChange(manager, (status: AppStateStatus) => {
      setAppState(status)
      // 可在此处添加：进入后台开启轮询、前台恢复 SSE 的策略
      // 但本次按要求不关闭流，仅建立框架与状态。
    })
    // 资源在 manager.disposeAll() 时自动清理，无需单独调用
  }, [manager, setAppState])
}
