/**
 * Cloud Sync - 统一错误处理模块
 * 单一职责：定义错误类型、错误码和错误处理逻辑
 */

// ── 错误码枚举 ────────────────────────────────────────────────

export enum CloudSyncErrorCode {
  // 网络相关
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // 认证相关
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // 配额相关
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // 同步相关
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_LOCKED = 'SYNC_LOCKED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',

  // 存储相关
  STORAGE_ERROR = 'STORAGE_ERROR',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

  // 服务端错误
  SERVER_ERROR = 'SERVER_ERROR',

  // 未知错误
  UNKNOWN = 'UNKNOWN',
}

// ── 基础错误类 ────────────────────────────────────────────────

export class CloudSyncError extends Error {
  constructor(
    message: string,
    public readonly code: CloudSyncErrorCode,
    public readonly recoverable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'CloudSyncError'
  }

  /** 是否为网络错误 */
  get isNetworkError(): boolean {
    return (
      this.code === CloudSyncErrorCode.NETWORK_ERROR ||
      this.code === CloudSyncErrorCode.TIMEOUT
    )
  }

  /** 是否为认证错误 */
  get isAuthError(): boolean {
    return (
      this.code === CloudSyncErrorCode.UNAUTHORIZED ||
      this.code === CloudSyncErrorCode.TOKEN_EXPIRED
    )
  }

  /** 是否为服务端错误 */
  get isServerError(): boolean {
    return this.code === CloudSyncErrorCode.SERVER_ERROR
  }
}

// ── 错误判断工具 ────────────────────────────────────────────

/** 判断是否为网络错误 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof CloudSyncError) {
    return error.isNetworkError
  }

  if (error instanceof TypeError) {
    return true // fetch 网络错误通常是 TypeError
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('network') ||
      msg.includes('网络') ||
      msg.includes('timeout') ||
      msg.includes('超时') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('fetch')
    )
  }

  return false
}

/** 从原始错误创建 CloudSyncError */
export const wrapError = (
  error: unknown,
  defaultCode: CloudSyncErrorCode = CloudSyncErrorCode.UNKNOWN
): CloudSyncError => {
  if (error instanceof CloudSyncError) {
    return error
  }

  const originalError = error instanceof Error ? error : new Error(String(error))
  const message = originalError.message || '未知错误'

  // 尝试识别错误类型
  if (isNetworkError(error)) {
    return new CloudSyncError(
      message,
      CloudSyncErrorCode.NETWORK_ERROR,
      true, // 网络错误可恢复
      originalError
    )
  }

  return new CloudSyncError(message, defaultCode, false, originalError)
}
