/**
 * [PROVIDES]: VaultManager - 多 Vault 管理服务
 * [DEPENDS]: expo-file-system, expo-secure-store, expo-crypto
 * [POS]: 管理 Vault 列表、创建、导入、切换、删除
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { File, Directory, Paths } from 'expo-file-system'
import * as SecureStore from 'expo-secure-store'
import { randomUUID } from 'expo-crypto'
import { setVault, resetVault } from './vault-service'
import type { VaultInfo } from './types'

// ── 常量 ────────────────────────────────────────────────────

const STORE_KEYS = {
  VAULT_LIST: 'moryflow_vault_list',
  CURRENT_VAULT_ID: 'moryflow_current_vault_id',
} as const

// ── 类型 ────────────────────────────────────────────────────

export interface ManagedVault {
  /** Vault 唯一 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 本地存储路径 */
  path: string
  /** 已绑定的云端 Vault ID */
  cloudVaultId?: string
  /** 创建时间 */
  createdAt: number
  /** 最后打开时间 */
  lastOpenedAt: number
}

// ── 存储操作 ────────────────────────────────────────────────

async function readVaultList(): Promise<ManagedVault[]> {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEYS.VAULT_LIST)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('[VaultManager] Failed to read vault list:', error)
  }
  return []
}

async function writeVaultList(vaults: ManagedVault[]): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(STORE_KEYS.VAULT_LIST, JSON.stringify(vaults))
    return true
  } catch (error) {
    console.error('[VaultManager] Failed to write vault list:', error)
    return false
  }
}

async function readCurrentVaultId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORE_KEYS.CURRENT_VAULT_ID)
  } catch (error) {
    console.error('[VaultManager] Failed to read current vault id:', error)
    return null
  }
}

async function writeCurrentVaultId(vaultId: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(STORE_KEYS.CURRENT_VAULT_ID, vaultId)
    return true
  } catch (error) {
    console.error('[VaultManager] Failed to write current vault id:', error)
    return false
  }
}

// ── 路径工具 ────────────────────────────────────────────────

/** 获取 vaults 目录根路径 */
function getVaultsRoot(): string {
  return Paths.join(Paths.document.uri, 'vaults')
}

// ── 核心 API ────────────────────────────────────────────────

/**
 * 获取所有 Vault 列表
 */
export async function getVaultList(): Promise<ManagedVault[]> {
  return readVaultList()
}

/**
 * 获取当前 Vault
 */
export async function getCurrentVault(): Promise<ManagedVault | null> {
  const vaults = await readVaultList()
  const currentId = await readCurrentVaultId()

  if (currentId) {
    const vault = vaults.find(v => v.id === currentId)
    if (vault) return vault
  }

  // 如果没有当前 vault 但列表不为空，返回第一个
  if (vaults.length > 0) {
    await writeCurrentVaultId(vaults[0].id)
    return vaults[0]
  }

  return null
}

/**
 * 创建新 Vault
 */
export async function createVault(name: string): Promise<ManagedVault> {
  const vaults = await readVaultList()

  // 检查名称是否重复
  if (vaults.some(v => v.name === name)) {
    throw new Error(`工作区 "${name}" 已存在`)
  }

  const id = randomUUID()
  const path = Paths.join(getVaultsRoot(), id)
  const now = Date.now()

  // 创建目录结构
  const dir = new Directory(path)
  dir.create({ intermediates: true })

  // 创建 .moryflow 目录
  const moryflowDir = new Directory(Paths.join(path, '.moryflow'))
  moryflowDir.create({ intermediates: true })

  // 初始化 file-index.json
  const fileIndexPath = Paths.join(path, '.moryflow', 'file-index.json')
  new File(fileIndexPath).write('{}')

  const newVault: ManagedVault = {
    id,
    name,
    path,
    createdAt: now,
    lastOpenedAt: now,
  }

  vaults.push(newVault)
  await writeVaultList(vaults)

  // 切换到新 Vault
  await switchVault(id)

  console.log('[VaultManager] Created vault:', name, path)
  return newVault
}

/**
 * 切换到指定 Vault
 */
export async function switchVault(vaultId: string): Promise<ManagedVault> {
  const vaults = await readVaultList()
  const vault = vaults.find(v => v.id === vaultId)

  if (!vault) {
    throw new Error('Vault 不存在')
  }

  // 更新最后打开时间
  vault.lastOpenedAt = Date.now()
  await writeVaultList(vaults)

  // 保存当前 Vault ID
  await writeCurrentVaultId(vaultId)

  // 更新 vault-service 的当前 vault
  const vaultInfo: VaultInfo = {
    name: vault.name,
    path: vault.path,
  }
  await setVault(vaultInfo)

  console.log('[VaultManager] Switched to vault:', vault.name)
  return vault
}

/**
 * 重命名 Vault
 */
export async function renameVault(vaultId: string, newName: string): Promise<ManagedVault> {
  const vaults = await readVaultList()
  const vault = vaults.find(v => v.id === vaultId)

  if (!vault) {
    throw new Error('Vault 不存在')
  }

  // 检查名称是否重复
  if (vaults.some(v => v.id !== vaultId && v.name === newName)) {
    throw new Error(`工作区 "${newName}" 已存在`)
  }

  vault.name = newName
  await writeVaultList(vaults)

  // 如果是当前 vault，更新 vault-service
  const currentId = await readCurrentVaultId()
  if (currentId === vaultId) {
    await setVault({ name: newName, path: vault.path })
  }

  console.log('[VaultManager] Renamed vault:', vaultId, 'to', newName)
  return vault
}

/**
 * 删除 Vault
 * @param vaultId Vault ID
 * @param deleteFiles 是否删除本地文件，默认 true
 */
export async function deleteVault(vaultId: string, deleteFiles: boolean = true): Promise<void> {
  const vaults = await readVaultList()
  const vaultIndex = vaults.findIndex(v => v.id === vaultId)

  if (vaultIndex === -1) {
    throw new Error('Vault 不存在')
  }

  const vault = vaults[vaultIndex]

  // 删除本地文件
  if (deleteFiles) {
    const dir = new Directory(vault.path)
    if (dir.exists) {
      dir.delete()
    }
  }

  // 从列表中移除
  vaults.splice(vaultIndex, 1)
  await writeVaultList(vaults)

  // 如果删除的是当前 vault，切换到其他 vault
  const currentId = await readCurrentVaultId()
  if (currentId === vaultId) {
    if (vaults.length > 0) {
      await switchVault(vaults[0].id)
    } else {
      await resetVault()
    }
  }

  console.log('[VaultManager] Deleted vault:', vault.name)
}

/**
 * 更新 Vault 的云端绑定 ID
 */
export async function updateCloudBinding(vaultId: string, cloudVaultId: string | undefined): Promise<void> {
  const vaults = await readVaultList()
  const vault = vaults.find(v => v.id === vaultId)

  if (!vault) {
    throw new Error('Vault 不存在')
  }

  vault.cloudVaultId = cloudVaultId
  await writeVaultList(vaults)
}

/**
 * 初始化 VaultManager
 * 返回当前 Vault，如果没有则创建默认 Vault
 */
export async function initVaultManager(): Promise<ManagedVault> {
  // 获取当前 vault
  let current = await getCurrentVault()

  // 如果没有 vault，创建默认的
  if (!current) {
    current = await createVault('My Vault')
  } else {
    // 确保 vault-service 同步
    await setVault({ name: current.name, path: current.path })
  }

  return current
}
