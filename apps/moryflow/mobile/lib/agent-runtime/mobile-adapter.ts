/**
 * [PROVIDES]: Mobile 平台能力适配器
 * [DEPENDS]: agents-adapter, expo-file-system, expo-secure-store
 * [POS]: Mobile 端 PlatformCapabilities 统一入口
 */

import type { PlatformCapabilities, CryptoUtils, AuthCapabilities } from '@moryflow/agents-adapter';
import { MEMBERSHIP_API_URL } from '@moryflow/api';
import {
  pathUtils,
  createFileSystem,
  getDefaultVaultRoot as getVaultRootFromFS,
  ensureVaultExists as ensureVaultFromFS,
  createStorage,
  createSecureStorage,
  createCrypto,
  logger,
} from './adapters';
import { notifyVaultChange } from '@/lib/vault/vault-service';
import { getAccessToken } from '@/lib/server/auth-session';

// ============ 状态管理 ============

let capabilitiesInstance: PlatformCapabilities | null = null;
let cryptoInstance: CryptoUtils | null = null;
let currentVaultRoot: string | null = null;

/**
 * 获取当前 Vault 根目录（内部使用）
 * 使用函数而非闭包捕获的变量，确保始终获取最新值
 */
function getCurrentVaultRoot(): string {
  if (!currentVaultRoot) {
    currentVaultRoot = getVaultRootFromFS();
  }
  return currentVaultRoot;
}

// ============ 公共 API ============

/**
 * 获取 Vault 根目录
 */
export function getDefaultVaultRoot(): string {
  return getCurrentVaultRoot();
}

/**
 * 确保 Vault 目录存在
 */
export function ensureVaultExists(customVaultRoot?: string): string {
  const root = ensureVaultFromFS(customVaultRoot);
  currentVaultRoot = root;
  logger.info('Vault directory ready:', root);
  return root;
}

/** 认证能力实现 */
const auth: AuthCapabilities = {
  getToken: async () => getAccessToken(),
  getApiUrl: () => MEMBERSHIP_API_URL,
};

/**
 * 创建 Mobile 平台能力实例
 */
export function createMobileCapabilities(): PlatformCapabilities {
  if (!capabilitiesInstance) {
    capabilitiesInstance = {
      // 传入函数引用确保始终获取最新的 vaultRoot
      // 传入 notifyVaultChange 回调，当 agent 操作文件时通知 VaultService 刷新 UI
      fs: createFileSystem(getCurrentVaultRoot, notifyVaultChange),
      path: pathUtils,
      storage: createStorage(),
      secureStorage: createSecureStorage(),
      fetch: globalThis.fetch,
      logger,
      platform: 'mobile',
      optional: undefined,
      auth,
    };
  }
  return capabilitiesInstance;
}

/**
 * 获取 Mobile 加密工具实例
 */
export function createMobileCrypto(): CryptoUtils {
  if (!cryptoInstance) {
    cryptoInstance = createCrypto();
  }
  return cryptoInstance;
}

// ============ 导出子模块 ============

export { pathUtils } from './adapters';
export { logger } from './adapters';
