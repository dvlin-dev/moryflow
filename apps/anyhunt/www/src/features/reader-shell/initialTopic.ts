/**
 * [PROVIDES]: normalizeInitialTopic
 * [DEPENDS]: none
 * [POS]: Reader Shell 创建订阅入口的初始主题安全归一化
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export function normalizeInitialTopic(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
