/**
 * [PROVIDES]: vaultService, useVault, useVaultTree, useVaultManager - Mobile Vault 服务与 Hooks
 * [DEPENDS]: expo-file-system - 移动端文件系统
 * [POS]: Mobile 端知识库管理入口，提供文件读写、目录树、变更监听、多 Vault 管理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 类型导出
export type {
  VaultInfo,
  ResolvedVaultPath,
  VaultTreeNode,
  VaultFileInfo,
  VaultChangeEvent,
  VaultChangeListener,
} from './types'

export type { ManagedVault } from './vault-manager'

// 服务导出
export {
  // VaultService 接口实现
  vaultService,
  getVault,
  setVault,
  resolvePath,
  validatePath,
  // 扩展功能
  getVaultRoot,
  readTree,
  readTreeRecursive,
  readFile,
  writeFile,
  deleteFile,
  moveFile,
  createDirectory,
  fileExists,
  getFileInfo,
  onVaultChange,
  resetVault,
} from './vault-service'

// VaultManager 导出
export {
  getVaultList,
  getCurrentVault,
  createVault,
  switchVault,
  renameVault,
  deleteVault,
  updateCloudBinding,
  initVaultManager,
} from './vault-manager'

// Hooks 导出
export {
  useVault,
  useVaultTree,
  useVaultFile,
  type UseVaultReturn,
  type UseVaultTreeReturn,
  type UseVaultFileReturn,
} from './use-vault'

export {
  useVaultManager,
  type UseVaultManagerReturn,
} from './use-vault-manager'

// FileIndex 导出
export { fileIndexManager } from './file-index'
