/**
 * [PROVIDES]: ServerApiError - 统一 API 错误类
 * [DEPENDS]: 无
 * [POS]: 被 create-client 和各端应用使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

/** 统一的 Server API 错误类 */
export class ServerApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
    public readonly errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ServerApiError';
  }

  /** 是否为认证错误（未登录） */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 是否为权限不足 */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** 是否为资源不存在 */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** 是否为请求频率限制 */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** 是否为服务器错误 */
  get isServerError(): boolean {
    return this.status >= 500;
  }
}
