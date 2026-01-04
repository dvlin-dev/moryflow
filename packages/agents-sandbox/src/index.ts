/**
 * [PROVIDES]: agents-sandbox 包统一导出
 * [POS]: 外部使用入口
 */

// 核心类
export { SandboxManager } from './sandbox-manager'

// 类型导出
export type {
  SandboxConfig,
  SandboxMode,
  PlatformType,
  AuthChoice,
  Storage,
  ExecuteResult,
  PlatformAdapter,
  AuthRequestCallback,
  CommandConfirmCallback,
} from './types'

// 错误类型
export {
  SandboxError,
  CommandNotAllowedError,
  PermissionDeniedError,
  type SandboxErrorCode,
} from './errors'

// 平台检测（可选导出，一般不需要直接使用）
export { detectPlatform, getPlatformName } from './platform'

// 子模块（可选导出，用于高级用法）
export {
  PathDetector,
  CommandExecutor,
  type ExecuteOptions,
  // 命令过滤
  filterCommand,
  isCommandBlocked,
  commandRequiresConfirmation,
  getBlockReason,
  type CommandFilterResult,
} from './command'
export { PathAuthorization } from './authorization'

// Bash 工具
export {
  createSandboxBashTool,
  type SandboxBashToolOptions,
} from './bash-tool'
