/**
 * [PROVIDES]: useCloudSync - Cloud Sync React Hook
 * [DEPENDS]: sync-engine
 * [POS]: 供 React 组件使用的 Cloud Sync Hook
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useSyncEngineStore, cloudSyncEngine } from '../sync-engine'
import type { SyncStatusSnapshot, CloudSyncSettings } from '../const'

/**
 * Cloud Sync Hook
 * 提供同步状态和控制方法
 */
export function useCloudSync() {
  const status = useSyncEngineStore((state) => state.status)
  const vaultId = useSyncEngineStore((state) => state.vaultId)
  const vaultName = useSyncEngineStore((state) => state.vaultName)
  const lastSyncAt = useSyncEngineStore((state) => state.lastSyncAt)
  const error = useSyncEngineStore((state) => state.error)
  const pendingCount = useSyncEngineStore((state) => state.pendingCount)
  const settings = useSyncEngineStore((state) => state.settings)

  const snapshot: SyncStatusSnapshot = {
    status,
    vaultId,
    vaultName,
    lastSyncAt,
    error,
    pendingCount,
  }

  const triggerSync = useCallback(() => {
    cloudSyncEngine.triggerSync()
  }, [])

  const updateSettings = useCallback(async (updates: Partial<CloudSyncSettings>) => {
    await cloudSyncEngine.updateSettings(updates)
  }, [])

  const handleFileChange = useCallback(() => {
    cloudSyncEngine.handleFileChange()
  }, [])

  return {
    // 状态
    ...snapshot,
    settings,

    // 派生状态
    isSyncing: status === 'syncing',
    isEnabled: status !== 'disabled',
    isOnline: status !== 'offline',
    hasError: !!error,

    // 方法
    triggerSync,
    updateSettings,
    handleFileChange,
  }
}

/**
 * 初始化 Cloud Sync
 * 在 App 启动或 Vault 打开时调用
 * 自动监听 App 前台/后台切换
 */
export function useCloudSyncInit(vaultPath: string | null) {
  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (vaultPath) {
      cloudSyncEngine.init(vaultPath)
    }

    return () => {
      cloudSyncEngine.stop()
    }
  }, [vaultPath])

  // App 前台切换时触发同步
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // 从后台切到前台时触发同步
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        cloudSyncEngine.triggerSync()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [])
}
