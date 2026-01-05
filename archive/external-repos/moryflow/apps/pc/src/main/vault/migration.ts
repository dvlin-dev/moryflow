/**
 * Vault 数据迁移
 * 从旧版单 Vault 存储迁移到新版多 Vault 存储
 */

import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { vaultPreferenceStore } from './const.js'
import {
  isMigrated,
  setMigrated,
  setVaults,
  setActiveVaultId,
  getVaults,
} from './store.js'
import type { VaultItem } from '../../shared/ipc.js'

/** 迁移结果 */
export type MigrationResult = {
  success: boolean
  skipped: boolean
  error?: string
  migratedVault?: VaultItem
}

/**
 * 执行 Vault 数据迁移
 * 从旧的 pc-settings store 迁移到新的 vault-store
 * @returns 迁移结果，包含成功/失败状态和详情
 */
export const migrateVaultData = (): MigrationResult => {
  // 已迁移则跳过
  if (isMigrated()) {
    console.log('[vault-migration] 已完成迁移，跳过')
    return { success: true, skipped: true }
  }

  console.log('[vault-migration] 开始迁移 Vault 数据...')

  try {
    // 读取旧的单 Vault 路径
    const oldPath = vaultPreferenceStore.get('recentVaultPath')

    if (oldPath) {
      console.log('[vault-migration] 发现旧 Vault 路径:', oldPath)

      // 检查新存储是否已有数据（防止覆盖）
      const existingVaults = getVaults()
      if (existingVaults.length > 0) {
        console.log('[vault-migration] 新存储已有数据，跳过迁移')
        setMigrated(true)
        return { success: true, skipped: true }
      }

      // 创建新的 VaultItem
      const newVault: VaultItem = {
        id: randomUUID(),
        path: path.resolve(oldPath),
        name: path.basename(oldPath),
        addedAt: Date.now(),
      }

      // 写入新存储
      setVaults([newVault])
      setActiveVaultId(newVault.id)

      // 标记迁移完成
      setMigrated(true)
      console.log('[vault-migration] 迁移成功:', newVault)
      return { success: true, skipped: false, migratedVault: newVault }
    }

    // 无旧数据需要迁移
    console.log('[vault-migration] 无旧 Vault 数据需要迁移')
    setMigrated(true)
    return { success: true, skipped: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[vault-migration] 迁移失败:', errorMessage)

    // 标记为已迁移，避免每次启动都尝试迁移
    // 但记录错误信息，便于排查问题
    setMigrated(true)

    return {
      success: false,
      skipped: false,
      error: `迁移失败: ${errorMessage}`,
    }
  }
}
