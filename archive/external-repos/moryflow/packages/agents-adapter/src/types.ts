/**
 * 平台能力接口
 * PC 和 Mobile 需要各自实现这些接口
 */

/** 文件信息 */
export interface FileInfo {
  isDirectory: boolean
  isFile: boolean
  size: number
  /** 修改时间（毫秒时间戳） */
  mtime: number
}

/** 文件系统接口 */
export interface FileSystem {
  /** 读取文件内容 */
  readFile(path: string, encoding?: 'utf-8'): Promise<string>
  /** 写入文件 */
  writeFile(path: string, content: string): Promise<void>
  /** 删除文件或目录 */
  delete(path: string): Promise<void>
  /** 移动/重命名 */
  move(from: string, to: string): Promise<void>
  /** 创建目录 */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  /** 读取目录内容 */
  readdir(path: string): Promise<string[]>
  /** 检查路径是否存在 */
  exists(path: string): Promise<boolean>
  /** 获取文件/目录信息 */
  stat(path: string): Promise<FileInfo>
  /** 检查文件是否可读 */
  access(path: string): Promise<boolean>
}

/** 路径工具接口 */
export interface PathUtils {
  join(...parts: string[]): string
  resolve(...parts: string[]): string
  dirname(path: string): string
  basename(path: string, ext?: string): string
  extname(path: string): string
  isAbsolute(path: string): boolean
  normalize(path: string): string
  relative(from: string, to: string): string
  /** 路径分隔符 */
  sep: string
}

/** 通用存储接口 */
export interface Storage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

/** 安全存储接口（用于 API Key 等敏感信息） */
export interface SecureStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/** 日志接口 */
export interface Logger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

/** Shell 执行结果 */
export interface ShellResult {
  stdout: string
  stderr: string
  exitCode: number
}

/** 文件变更事件 */
export interface FileWatchEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
}

/** 可选的平台能力 */
export interface OptionalCapabilities {
  /** Shell 执行（仅桌面端） */
  executeShell?(command: string, cwd: string, timeout?: number): Promise<ShellResult>
  /** 文件监听（可选） */
  watchFiles?(paths: string[], callback: (event: FileWatchEvent) => void): () => void
}

/** 平台标识 */
export type Platform = 'desktop' | 'mobile'

/** 认证能力接口 */
export interface AuthCapabilities {
  /** 获取认证 Token */
  getToken: () => Promise<string | null>
  /** 获取 API 服务器地址 */
  getApiUrl: () => string
}

/**
 * 平台能力接口
 * 所有平台相关的操作都通过这个接口进行
 */
export interface PlatformCapabilities {
  /** 文件系统 */
  fs: FileSystem
  /** 路径工具 */
  path: PathUtils
  /** 通用存储 */
  storage: Storage
  /** 安全存储 */
  secureStorage: SecureStorage
  /** 网络请求 */
  fetch: typeof globalThis.fetch
  /** 日志 */
  logger: Logger
  /** 平台标识 */
  platform: Platform
  /** 可选能力 */
  optional?: OptionalCapabilities
  /** 认证能力 */
  auth: AuthCapabilities
}

/**
 * Vault 信息
 */
export interface VaultInfo {
  /** Vault 名称 */
  name: string
  /** Vault 根路径（绝对路径） */
  path: string
}

/**
 * 解析后的 Vault 路径
 */
export interface ResolvedVaultPath {
  /** Vault 根路径 */
  root: string
  /** 绝对路径 */
  absolute: string
  /** 相对于 Vault 的路径 */
  relative: string
}

/**
 * Vault 服务接口
 *
 * 用于 Mobile 端的 Vault 管理，参见 Phase 4 (mobile-refactor-plan.md)。
 * PC 端使用 VaultUtils + 直接读取配置的方式，Mobile 端将实现此接口来管理 Vault 状态。
 */
export interface VaultService {
  /** 获取当前 Vault 信息 */
  getVault(): Promise<VaultInfo | null>
  /** 设置 Vault */
  setVault(info: VaultInfo): Promise<void>
  /** 解析路径（相对于 Vault） */
  resolvePath(targetPath: string): Promise<ResolvedVaultPath>
  /** 验证路径是否在 Vault 内 */
  validatePath(targetPath: string): Promise<boolean>
}

/**
 * 计算 SHA256 哈希（支持同步或异步）
 */
export type ComputeSha256 = (input: string | Uint8Array) => string | Promise<string>

/**
 * 加密工具接口
 */
export interface CryptoUtils {
  /** 计算 SHA256（可能是异步的，调用时需 await） */
  sha256: ComputeSha256
  /** 生成 UUID */
  randomUUID: () => string
}
