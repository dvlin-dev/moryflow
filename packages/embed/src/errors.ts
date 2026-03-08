/**
 * [PROVIDES]: EmbedError, NetworkError, ApiError
 * [DEPENDS]: none
 * [POS]: Embed SDK 错误基类与分类
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
