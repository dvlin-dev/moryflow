/**
 * [PROVIDES]: normalizeInitialTopic
 * [DEPENDS]: none
 * [POS]: Reader Shell 创建订阅入口的初始主题安全归一化
 * [UPDATE]: 2026-01-28 过滤非字符串输入，避免点击事件对象传入
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

export function normalizeInitialTopic(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
