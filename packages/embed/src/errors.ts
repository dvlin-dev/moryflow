/**
 * [PROVIDES]: EmbedError, NetworkError, ApiError
 * [DEPENDS]: none
 * [POS]: Embed SDK 错误基类与分类
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed/CLAUDE.md
 */

/** 基础错误类 */
export class EmbedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmbedError';
    this.code = code;
  }
}

/** 网络错误 */
export class NetworkError extends EmbedError {
  constructor(message: string) {
    super('NETWORK_ERROR', message);
    this.name = 'NetworkError';
  }
}

/** API 错误 */
export class ApiError extends EmbedError {
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(code, message);
    this.name = 'ApiError';
    this.status = status;
  }
}
