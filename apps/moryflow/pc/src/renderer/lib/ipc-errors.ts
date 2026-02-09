/**
 * [PROVIDES]: extractIpcErrorMessage - 从 Electron IPC Error.message 提取真实错误文本
 * [DEPENDS]: -
 * [POS]: Renderer 通用工具，供 hooks/components 统一处理 IPC 错误信息
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

/**
 * 从 Electron IPC 错误中提取实际错误消息
 * 移除 "Error invoking remote method 'xxx': Error:" 前缀
 */
export function extractIpcErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/Error invoking remote method '[^']+': Error: (.+)/);
  return match ? match[1] : err.message;
}
