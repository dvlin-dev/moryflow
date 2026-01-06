/**
 * [DEFINES]: 沙盒模块核心类型定义
 * [USED_BY]: sandbox-manager, platform/, command/, authorization/
 * [POS]: 所有模块共享的类型定义
 */

/** 沙盒模式 */
export type SandboxMode = 'normal' | 'unrestricted'

/** 平台类型 */
export type PlatformType = 'macos-sandbox' | 'soft-isolation'

/** 授权选择 */
export type AuthChoice = 'deny' | 'allow_once' | 'allow_always'

/** 存储接口（用于持久化授权路径） */
export interface Storage {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
}

/** 沙盒配置 */
export interface SandboxConfig {
  /** 沙盒模式 */
  mode: SandboxMode
  /** Vault 根目录 */
  vaultRoot: string
  /** 持久化存储 */
  storage: Storage
}

/** 命令执行结果 */
export interface ExecuteResult {
  /** 退出码 */
  exitCode: number
  /** 标准输出 */
  stdout: string
  /** 标准错误 */
  stderr: string
  /** 执行耗时（毫秒） */
  duration: number
}

/** 平台适配器接口 */
export interface PlatformAdapter {
  /** 平台类型 */
  readonly type: PlatformType
  /** 初始化沙盒（如需要） */
  initialize?(config: SandboxConfig): Promise<void>
  /** 包装命令（添加沙盒限制） */
  wrapCommand(command: string, config: SandboxConfig): Promise<string>
}

/** 授权请求回调 */
export type AuthRequestCallback = (path: string) => Promise<AuthChoice>

/** 命令确认回调（用于非白名单命令） */
export type CommandConfirmCallback = (command: string, reason: string) => Promise<boolean>
