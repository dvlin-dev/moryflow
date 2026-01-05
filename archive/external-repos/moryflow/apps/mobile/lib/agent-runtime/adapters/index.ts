/**
 * Mobile 平台适配器模块
 * 统一导出所有适配器
 */

// 路径工具
export { pathUtils } from './path-utils'

// 文件系统
export {
  createFileSystem,
  getDefaultVaultRoot,
  ensureVaultExists,
} from './file-system'

// 存储
export {
  MobileStorage,
  MobileSecureStorage,
  createStorage,
  createSecureStorage,
} from './storage'

// 加密
export { cryptoUtils, createCrypto } from './crypto'

// 日志
export { logger, createLogger } from './logger'

// Fetch 适配器
export { mobileFetch } from './fetch-adapter'
