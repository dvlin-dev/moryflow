/**
 * 云同步状态订阅 hook
 * 提供同步状态、设置管理和操作方法
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  SyncStatusSnapshot,
  SyncStatusDetail,
  CloudSyncSettings,
  VaultBinding,
  CloudVault,
  CloudUsageInfo,
  CloudSyncStatusEvent,
} from '@shared/ipc'

type UseCloudSyncReturn = {
  /** 同步状态快照 */
  status: SyncStatusSnapshot | null
  /** 云同步设置 */
  settings: CloudSyncSettings | null
  /** 当前 vault 绑定信息 */
  binding: VaultBinding | null
  /** 是否已加载 */
  isLoaded: boolean
  /** 刷新状态 */
  refresh: () => Promise<void>
  /** 手动触发同步 */
  triggerSync: () => Promise<void>
  /** 更新设置 */
  updateSettings: (patch: Partial<CloudSyncSettings>) => Promise<CloudSyncSettings | null>
  /** 获取云端 Vault 列表 */
  listCloudVaults: () => Promise<CloudVault[]>
  /** 绑定 Vault */
  bindVault: (localPath: string, vaultId?: string, vaultName?: string) => Promise<VaultBinding | null>
  /** 解绑 Vault */
  unbindVault: (localPath: string) => Promise<void>
  /** 获取用量信息 */
  getUsage: () => Promise<CloudUsageInfo | null>
  /** 获取包含活动详情的状态（用于 HoverCard 高级显示） */
  getStatusDetail: () => Promise<SyncStatusDetail | null>
}

/**
 * 订阅云同步状态变更
 */
export const useCloudSync = (vaultPath?: string | null): UseCloudSyncReturn => {
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null)
  const [settings, setSettings] = useState<CloudSyncSettings | null>(null)
  const [binding, setBinding] = useState<VaultBinding | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // 加载初始状态
  const refresh = useCallback(async () => {
    if (!window.desktopAPI?.cloudSync) return

    try {
      const [statusSnapshot, settingsData] = await Promise.all([
        window.desktopAPI.cloudSync.getStatus(),
        window.desktopAPI.cloudSync.getSettings(),
      ])
      setStatus(statusSnapshot)
      setSettings(settingsData)
      setIsLoaded(true)
    } catch (error) {
      console.error('[use-cloud-sync] 获取状态失败', error)
    }
  }, [])

  // 加载 vault 绑定信息（带竞态条件保护）
  useEffect(() => {
    if (!vaultPath || !window.desktopAPI?.cloudSync) {
      setBinding(null)
      return
    }

    let cancelled = false

    window.desktopAPI.cloudSync
      .getBinding(vaultPath)
      .then((result) => {
        // 防止旧请求覆盖新请求的结果
        if (!cancelled) {
          setBinding(result)
        }
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [vaultPath])

  // 初始加载
  useEffect(() => {
    void refresh()
  }, [refresh])

  // 订阅状态变更
  useEffect(() => {
    if (!window.desktopAPI?.cloudSync?.onStatusChange) return

    const dispose = window.desktopAPI.cloudSync.onStatusChange((event: CloudSyncStatusEvent) => {
      setStatus(event.status)
    })

    return dispose
  }, [])

  // 手动触发同步
  const triggerSync = useCallback(async () => {
    if (!window.desktopAPI?.cloudSync?.triggerSync) return
    try {
      await window.desktopAPI.cloudSync.triggerSync()
    } catch (error) {
      console.error('[use-cloud-sync] 触发同步失败', error)
    }
  }, [])

  // 更新设置
  const updateSettings = useCallback(
    async (patch: Partial<CloudSyncSettings>): Promise<CloudSyncSettings | null> => {
      if (!window.desktopAPI?.cloudSync?.updateSettings) return null
      try {
        const updated = await window.desktopAPI.cloudSync.updateSettings(patch)
        setSettings(updated)
        return updated
      } catch (error) {
        console.error('[use-cloud-sync] 更新设置失败', error)
        return null
      }
    },
    []
  )

  // 获取云端 Vault 列表
  const listCloudVaults = useCallback(async (): Promise<CloudVault[]> => {
    if (!window.desktopAPI?.cloudSync?.listCloudVaults) return []
    try {
      return await window.desktopAPI.cloudSync.listCloudVaults()
    } catch (error) {
      console.error('[use-cloud-sync] 获取 Vault 列表失败', error)
      return []
    }
  }, [])

  // 绑定 Vault
  const bindVault = useCallback(
    async (
      localPath: string,
      vaultId?: string,
      vaultName?: string
    ): Promise<VaultBinding | null> => {
      if (!window.desktopAPI?.cloudSync?.bindVault) return null
      try {
        const result = await window.desktopAPI.cloudSync.bindVault({
          localPath,
          vaultId,
          vaultName,
        })
        setBinding(result)
        // 刷新状态
        void refresh()
        return result
      } catch (error) {
        console.error('[use-cloud-sync] 绑定 Vault 失败', error)
        return null
      }
    },
    [refresh]
  )

  // 解绑 Vault
  const unbindVault = useCallback(
    async (localPath: string): Promise<void> => {
      if (!window.desktopAPI?.cloudSync?.unbindVault) return
      try {
        await window.desktopAPI.cloudSync.unbindVault(localPath)
        setBinding(null)
        void refresh()
      } catch (error) {
        console.error('[use-cloud-sync] 解绑 Vault 失败', error)
      }
    },
    [refresh]
  )

  // 获取用量信息
  const getUsage = useCallback(async (): Promise<CloudUsageInfo | null> => {
    if (!window.desktopAPI?.cloudSync?.getUsage) return null
    try {
      return await window.desktopAPI.cloudSync.getUsage()
    } catch (error) {
      console.error('[use-cloud-sync] 获取用量失败', error)
      return null
    }
  }, [])

  // 获取包含活动详情的状态
  const getStatusDetail = useCallback(async (): Promise<SyncStatusDetail | null> => {
    if (!window.desktopAPI?.cloudSync?.getStatusDetail) return null
    try {
      return await window.desktopAPI.cloudSync.getStatusDetail()
    } catch (error) {
      console.error('[use-cloud-sync] 获取状态详情失败', error)
      return null
    }
  }, [])

  return {
    status,
    settings,
    binding,
    isLoaded,
    refresh,
    triggerSync,
    updateSettings,
    listCloudVaults,
    bindVault,
    unbindVault,
    getUsage,
    getStatusDetail,
  }
}
