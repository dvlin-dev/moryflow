/**
 * Glob 功能抽象接口
 *
 * 用于在不同平台（Node.js / React Native）上提供统一的 glob 功能。
 */

/**
 * Glob 选项
 */
export interface GlobOptions {
  /** 工作目录 */
  cwd: string
  /** 匹配模式 */
  patterns: string[]
  /** 是否只匹配文件（不包含目录） */
  onlyFiles?: boolean
  /** 是否匹配隐藏文件（以 . 开头） */
  dot?: boolean
  /** 最大结果数量 */
  limit?: number
}

/**
 * Glob 结果项
 */
export interface GlobEntry {
  /** 相对路径 */
  path: string
  /** 是否为目录 */
  isDirectory: boolean
}

/**
 * Glob 实现接口
 */
export interface GlobImpl {
  /**
   * 执行 glob 匹配
   * @param options 匹配选项
   * @returns 匹配的文件/目录列表（相对路径）
   */
  glob(options: GlobOptions): Promise<string[]>

  /**
   * 执行 glob 匹配并返回详细信息
   * @param options 匹配选项
   * @returns 匹配的文件/目录详细信息
   */
  globWithDetails?(options: GlobOptions): Promise<GlobEntry[]>
}

/**
 * 全局 glob 实现实例
 * 由平台初始化时设置
 */
let globalGlobImpl: GlobImpl | null = null

/**
 * 设置全局 glob 实现
 */
export function setGlobImpl(impl: GlobImpl): void {
  globalGlobImpl = impl
}

/**
 * 获取全局 glob 实现
 */
export function getGlobImpl(): GlobImpl {
  if (!globalGlobImpl) {
    throw new Error(
      '[agents-tools] Glob 实现未初始化。' +
        '请在使用 glob/grep 工具前调用 setGlobImpl() 或 initNodeGlob() / initMobileGlob()'
    )
  }
  return globalGlobImpl
}

/**
 * 检查 glob 实现是否已初始化
 */
export function isGlobImplInitialized(): boolean {
  return globalGlobImpl !== null
}
