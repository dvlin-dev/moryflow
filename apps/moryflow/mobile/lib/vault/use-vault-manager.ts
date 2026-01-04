/**
 * [PROVIDES]: useVaultManager - 多 Vault 管理 Hook
 * [DEPENDS]: vault-manager.ts
 * [POS]: React Hook 封装 VaultManager 操作
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getVaultList,
  getCurrentVault,
  createVault,
  switchVault,
  renameVault,
  deleteVault,
  initVaultManager,
  type ManagedVault,
} from './vault-manager'

export interface UseVaultManagerReturn {
  /** 所有 Vault 列表 */
  vaults: ManagedVault[]
  /** 当前 Vault */
  currentVault: ManagedVault | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否正在执行操作 */
  isOperating: boolean
  /** 错误信息 */
  error: string | null

  /** 刷新列表 */
  refresh: () => Promise<void>
  /** 创建 Vault */
  create: (name: string) => Promise<ManagedVault>
  /** 切换 Vault */
  switch_: (vaultId: string) => Promise<void>
  /** 重命名 Vault */
  rename: (vaultId: string, newName: string) => Promise<void>
  /** 删除 Vault */
  delete_: (vaultId: string, deleteFiles?: boolean) => Promise<void>
}

export function useVaultManager(): UseVaultManagerReturn {
  const [vaults, setVaults] = useState<ManagedVault[]>([])
  const [currentVault, setCurrentVault] = useState<ManagedVault | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOperating, setIsOperating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 刷新列表
  const refresh = useCallback(async () => {
    try {
      const [list, current] = await Promise.all([
        getVaultList(),
        getCurrentVault(),
      ])
      setVaults(list)
      setCurrentVault(current)
      setError(null)
    } catch (err) {
      console.error('[useVaultManager] Refresh failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load vaults')
    }
  }, [])

  // 初始化
  useEffect(() => {
    let mounted = true

    async function init() {
      setIsLoading(true)
      try {
        await initVaultManager()
        if (mounted) {
          await refresh()
        }
      } catch (err) {
        console.error('[useVaultManager] Init failed:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [refresh])

  // 创建 Vault
  const create = useCallback(async (name: string): Promise<ManagedVault> => {
    setIsOperating(true)
    setError(null)
    try {
      const vault = await createVault(name)
      await refresh()
      return vault
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create vault'
      setError(message)
      throw err
    } finally {
      setIsOperating(false)
    }
  }, [refresh])

  // 切换 Vault
  const switch_ = useCallback(async (vaultId: string): Promise<void> => {
    setIsOperating(true)
    setError(null)
    try {
      await switchVault(vaultId)
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch vault'
      setError(message)
      throw err
    } finally {
      setIsOperating(false)
    }
  }, [refresh])

  // 重命名 Vault
  const rename = useCallback(async (vaultId: string, newName: string): Promise<void> => {
    setIsOperating(true)
    setError(null)
    try {
      await renameVault(vaultId, newName)
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename vault'
      setError(message)
      throw err
    } finally {
      setIsOperating(false)
    }
  }, [refresh])

  // 删除 Vault
  const delete_ = useCallback(async (vaultId: string, deleteFiles: boolean = true): Promise<void> => {
    setIsOperating(true)
    setError(null)
    try {
      await deleteVault(vaultId, deleteFiles)
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete vault'
      setError(message)
      throw err
    } finally {
      setIsOperating(false)
    }
  }, [refresh])

  return {
    vaults,
    currentVault,
    isLoading,
    isOperating,
    error,
    refresh,
    create,
    switch_,
    rename,
    delete_,
  }
}
