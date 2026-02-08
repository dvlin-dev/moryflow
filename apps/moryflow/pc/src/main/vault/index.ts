/**
 * [PROVIDES]: Vault CRUD、文件操作、目录树读取 - 知识库管理 API
 * [DEPENDS]: context.js, store.js, files.js, entries.js, tree.js - 内部子模块
 * [POS]: PC 端 Vault 管理入口，提供本地知识库的完整文件系统操作
 * [UPDATE]: 2026-02-08 - 新增 `ensureDefaultWorkspace`，用于首次启动自动创建默认 workspace
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
export {
  createVault,
  ensureDefaultWorkspace,
  ensureVaultAccess,
  ensureWithinVault,
  getStoredVault,
  getActiveVaultInfo,
  openVault,
  openVaultByPath,
  selectDirectory,
  switchVault,
} from './context.js';

export {
  getVaults,
  getVaultById,
  getVaultByPath,
  getActiveVault,
  getActiveVaultId,
  setActiveVaultId,
  addVault,
  removeVault,
  updateVaultName,
  isMigrated,
  setMigrated,
  setVaults,
} from './store.js';
export { createVaultFile, createVaultFolder, readVaultFile, writeVaultFile } from './files.js';
export { deleteVaultEntry, moveVaultEntry, renameVaultEntry, showItemInFinder } from './entries.js';
export { readVaultTree, readVaultTreeChildren, readVaultTreeRoot } from './tree.js';
