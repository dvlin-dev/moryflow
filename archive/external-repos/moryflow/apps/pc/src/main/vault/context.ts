import { dialog } from 'electron'
import path from 'node:path'
import { access, mkdir } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'

import type { VaultCreateOptions, VaultInfo, VaultItem, VaultOpenOptions } from '../../shared/ipc.js'

import { vaultCreateSchema, vaultOpenSchema } from './const.js'
import {
  addVault,
  getActiveVault,
  getVaultById,
  getVaultByPath,
  setActiveVaultId,
} from './store.js'

/**
 * 确保目标路径可读可写，无法访问时抛出错误阻止继续操作。
 */
export const ensureVaultAccess = async (targetPath: string) => {
  await access(targetPath, fsConstants.R_OK | fsConstants.W_OK)
}

/**
 * 获取当前活动 Vault（兼容旧接口）
 * 保持 Agent Runtime 等模块的兼容性
 */
export const getStoredVault = async (): Promise<VaultInfo | null> => {
  const activeVault = getActiveVault()
  if (!activeVault) return null

  try {
    await ensureVaultAccess(activeVault.path)
    return { path: activeVault.path }
  } catch (error) {
    console.warn('[vault] active vault path invalid', error)
    return null
  }
}

/**
 * 获取当前活动 Vault 的完整信息
 */
export const getActiveVaultInfo = async (): Promise<VaultItem | null> => {
  const activeVault = getActiveVault()
  if (!activeVault) return null

  try {
    await ensureVaultAccess(activeVault.path)
    return activeVault
  } catch (error) {
    console.warn('[vault] active vault path invalid', error)
    return null
  }
}

const promptVaultSelection = async (): Promise<VaultItem | null> => {
  const result = await dialog.showOpenDialog({
    title: '选择笔记库 (Vault)',
    properties: ['openDirectory', 'createDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const selectedPath = result.filePaths[0]

  try {
    await ensureVaultAccess(selectedPath)
    // 添加到 Vault 列表并设为活动
    return addVault(selectedPath)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('无法访问所选文件夹', reason)
    return null
  }
}

export const openVault = async (rawOptions?: VaultOpenOptions): Promise<VaultInfo | null> => {
  const options = vaultOpenSchema.parse(rawOptions ?? {})

  if (options.askUser) {
    const vault = await promptVaultSelection()
    return vault ? { path: vault.path } : null
  }

  const stored = await getStoredVault()
  if (stored) return stored

  const vault = await promptVaultSelection()
  return vault ? { path: vault.path } : null
}

/**
 * 打开目录选择对话框，返回选中的目录路径
 */
export const selectDirectory = async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title: '选择仓库存放位置',
    buttonLabel: '选择',
    properties: ['openDirectory', 'createDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

/**
 * 创建新的 Vault：在指定目录下创建新文件夹并设置为当前 Vault
 */
export const createVault = async (rawOptions?: VaultCreateOptions): Promise<VaultInfo | null> => {
  const options = vaultCreateSchema.parse(rawOptions ?? {})
  const name = options.name.trim()
  const parentPath = options.parentPath.trim()

  if (!name || !parentPath) {
    return null
  }

  const newVaultPath = path.join(parentPath, name)

  try {
    // 创建新文件夹
    await mkdir(newVaultPath, { recursive: true })
    await ensureVaultAccess(newVaultPath)
    // 添加到 Vault 列表并设为活动
    const vault = addVault(newVaultPath, name)
    return { path: vault.path }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('创建仓库失败', reason)
    return null
  }
}

/**
 * 校验目标路径是否位于当前 Vault 内，防止越权访问。
 */
export const ensureWithinVault = async (targetPath: string) => {
  const info = await getStoredVault()
  if (!info) {
    throw new Error('尚未选择 Vault')
  }

  const vaultRoot = path.resolve(info.path)
  const resolvedTarget = path.resolve(targetPath)
  if (!resolvedTarget.startsWith(vaultRoot)) {
    throw new Error('路径不在当前 Vault 中')
  }

  return { resolvedTarget, vaultRoot }
}

/**
 * 切换到指定 Vault
 */
export const switchVault = async (vaultId: string): Promise<VaultItem | null> => {
  const vaultItem = getVaultById(vaultId)
  if (!vaultItem) return null

  try {
    await ensureVaultAccess(vaultItem.path)
    setActiveVaultId(vaultId)
    return vaultItem
  } catch (error) {
    console.warn('[vault] cannot switch to vault, path invalid', error)
    return null
  }
}

/**
 * 通过路径添加并打开 Vault
 */
export const openVaultByPath = async (vaultPath: string): Promise<VaultItem | null> => {
  try {
    await ensureVaultAccess(vaultPath)
    return addVault(vaultPath)
  } catch (error) {
    console.warn('[vault] cannot open vault path', error)
    return null
  }
}
