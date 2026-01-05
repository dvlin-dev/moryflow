/**
 * [DEFINES]: 同步错误类型
 * [USED_BY]: 客户端同步引擎、服务端 Controller
 * [POS]: 提供统一的错误处理接口
 */

/**
 * 同步错误码
 */
export type SyncErrorCode =
  | 'SYNC_IN_PROGRESS'
  | 'NETWORK_ERROR'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'COMMIT_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_STATE'
  | 'VAULT_NOT_FOUND'
  | 'UNAUTHORIZED'

/**
 * 同步错误
 */
export class SyncError extends Error {
  constructor(
    public readonly code: SyncErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'SyncError'
  }

  get isRetryable(): boolean {
    return ['NETWORK_ERROR', 'UPLOAD_FAILED', 'DOWNLOAD_FAILED'].includes(this.code)
  }

  get isQuotaError(): boolean {
    return this.code === 'QUOTA_EXCEEDED'
  }

  get isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED'
  }
}

/**
 * 创建网络错误
 */
export function createNetworkError(message: string, cause?: Error): SyncError {
  return new SyncError('NETWORK_ERROR', message, cause)
}

/**
 * 创建上传失败错误
 */
export function createUploadError(path: string, status: number): SyncError {
  return new SyncError('UPLOAD_FAILED', `Upload failed for ${path}: ${status}`)
}

/**
 * 创建下载失败错误
 */
export function createDownloadError(path: string, status: number): SyncError {
  return new SyncError('DOWNLOAD_FAILED', `Download failed for ${path}: ${status}`)
}

/**
 * 创建配额超限错误
 */
export function createQuotaError(message: string): SyncError {
  return new SyncError('QUOTA_EXCEEDED', message)
}
