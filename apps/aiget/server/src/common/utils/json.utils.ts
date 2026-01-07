/**
 * [PROVIDES]: JSON 运行时转换工具
 * [DEPENDS]: none
 * [POS]: 统一处理 Prisma JSON 字段到 API 响应类型（Record<string, unknown>）的转换
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 src/common/CLAUDE.md
 */

export function asRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object') {
    return null;
  }
  if (Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
