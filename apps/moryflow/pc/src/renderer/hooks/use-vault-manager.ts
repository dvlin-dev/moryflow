/**
 * Vault 管理 Hook
 * 提供多 Vault 列表、切换、创建等操作
 */

import { useCallback, useEffect, useState } from 'react'
import type { VaultItem } from '@shared/ipc'

type UseVaultManagerReturn = {
  /** 所有 Vault 列表 */
  vaults: VaultItem[]
  /** 当前活动 Vault */
  activeVault: VaultItem | null
  /** 是否加载中 */
  isLoading: boolean
  /** 切换到指定 Vault */
  switchVault: (vaultId: string) => Promise<void>
  /** 打开文件夹作为 Vault */
  openFolder: () => Promise<void>
  /** 创建新 Vault */
  createVault: (name: string, parentPath: string) => Promise<void>
  /** 移除 Vault（不删除文件） */
  removeVault: (vaultId: string) => Promise<void>
  /** 重命名 Vault */
  renameVault: (vaultId: string, name: string) => Promise<void>
  /** 验证工作区：检查目录是否存在，删除不存在的 */
  validateVaults: () => Promise<void>
  /** 刷新列表 */
  refresh: () => Promise<void>
}

export const useVaultManager = (): UseVaultManagerReturn => {
  const [vaults, setVaults] = useState<VaultItem[]>([])
  const [activeVault, setActiveVault] = useState<VaultItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 加载 Vault 列表
  const loadVaults = useCallback(async () => {
    if (!window.desktopAPI?.vault) return

    try {
      const [vaultList, active] = await Promise.all([
        window.desktopAPI.vault.getVaults(),
        window.desktopAPI.vault.getActiveVault(),
      ])
      setVaults(vaultList)
      setActiveVault(active)
    } catch (error) {
      console.error('[use-vault-manager] 加载 Vault 失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    void loadVaults()
  }, [loadVaults])

  // 监听 Vault 列表变更
  useEffect(() => {
    if (!window.desktopAPI?.vault?.onVaultsChange) return

    const dispose = window.desktopAPI.vault.onVaultsChange((newVaults) => {
      setVaults(newVaults)
    })

    return dispose
  }, [])

  // 监听活动 Vault 变更
  useEffect(() => {
    if (!window.desktopAPI?.vault?.onActiveVaultChange) return

    const dispose = window.desktopAPI.vault.onActiveVaultChange((vault) => {
      setActiveVault(vault)
    })

    return dispose
  }, [])

  // 切换 Vault
  const switchVault = useCallback(async (vaultId: string) => {
    if (!window.desktopAPI?.vault?.setActiveVault) return

    try {
      const vault = await window.desktopAPI.vault.setActiveVault(vaultId)
      if (vault) {
        setActiveVault(vault)
      }
    } catch (error) {
      console.error('[use-vault-manager] 切换 Vault 失败:', error)
    }
  }, [])

  // 打开文件夹
  const openFolder = useCallback(async () => {
    if (!window.desktopAPI?.vault?.open) return

    try {
      const result = await window.desktopAPI.vault.open({ askUser: true })
      if (result) {
        // 重新加载列表
        await loadVaults()
      }
    } catch (error) {
      console.error('[use-vault-manager] 打开文件夹失败:', error)
    }
  }, [loadVaults])

  // 创建新 Vault
  const createVault = useCallback(
    async (name: string, parentPath: string) => {
      if (!window.desktopAPI?.vault?.create) return

      try {
        const result = await window.desktopAPI.vault.create({ name, parentPath })
        if (result) {
          await loadVaults()
        }
      } catch (error) {
        console.error('[use-vault-manager] 创建 Vault 失败:', error)
      }
    },
    [loadVaults]
  )

  // 移除 Vault
  const removeVault = useCallback(async (vaultId: string) => {
    if (!window.desktopAPI?.vault?.removeVault) return

    try {
      await window.desktopAPI.vault.removeVault(vaultId)
    } catch (error) {
      console.error('[use-vault-manager] 移除 Vault 失败:', error)
    }
  }, [])

  // 重命名 Vault
  const renameVault = useCallback(async (vaultId: string, name: string) => {
    if (!window.desktopAPI?.vault?.renameVault) return

    try {
      await window.desktopAPI.vault.renameVault(vaultId, name)
      // 重命名后刷新列表以更新显示
      await loadVaults()
    } catch (error) {
      console.error('[use-vault-manager] 重命名 Vault 失败:', error)
    }
  }, [loadVaults])

  // 验证工作区：检查目录是否存在，删除不存在的
  const validateVaults = useCallback(async () => {
    if (!window.desktopAPI?.vault?.validateVaults) return

    try {
      await window.desktopAPI.vault.validateVaults()
    } catch (error) {
      console.error('[use-vault-manager] 验证工作区失败:', error)
    }
  }, [])

  return {
    vaults,
    activeVault,
    isLoading,
    switchVault,
    openFolder,
    createVault,
    removeVault,
    renameVault,
    validateVaults,
    refresh: loadVaults,
  }
}
