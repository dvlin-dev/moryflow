/**
 * [PROVIDES]: 沙盒相关错误定义
 * [DEPENDS]: 无
 * [POS]: 统一错误处理
 */

/** 错误码类型 */
export type SandboxErrorCode =
  | 'ACCESS_DENIED' // 访问被拒绝
  | 'EXECUTION_FAILED' // 执行失败
  | 'TIMEOUT' // 超时
  | 'SANDBOX_INIT_FAILED' // 沙盒初始化失败

/** 沙盒错误 */
export class SandboxError extends Error {
  constructor(
    public readonly code: SandboxErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'SandboxError'
  }

  /** 包装未知错误为 SandboxError */
  static wrap(error: unknown): SandboxError {
    if (error instanceof SandboxError) return error
    if (error instanceof CommandNotAllowedError) return error
    if (error instanceof PermissionDeniedError) return error
    if (error instanceof Error) {
      return new SandboxError('EXECUTION_FAILED', error.message, error)
    }
    return new SandboxError('EXECUTION_FAILED', String(error))
  }
}

/** 命令不被允许（危险命令或用户拒绝） */
export class CommandNotAllowedError extends SandboxError {
  constructor(message: string) {
    super('ACCESS_DENIED', message)
    this.name = 'CommandNotAllowedError'
  }
}

/** 权限被拒绝（外部路径访问） */
export class PermissionDeniedError extends SandboxError {
  constructor(public readonly path: string, message?: string) {
    super('ACCESS_DENIED', message ?? `Permission denied: ${path}`)
    this.name = 'PermissionDeniedError'
  }
}
