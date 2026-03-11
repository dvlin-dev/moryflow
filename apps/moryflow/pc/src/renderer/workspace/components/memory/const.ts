/**
 * [PROVIDES]: Memory 页面占位文案与简单错误提取
 * [DEPENDS]: -
 * [POS]: PR 3 阶段的 Memory 导航占位页常量
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export const MEMORY_PAGE_TITLE = 'Memory';
export const MEMORY_PAGE_SUBTITLE =
  'Memory Workbench is wired through Moryflow Server and ready for renderer integration.';

export const extractMemoryErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Failed to load memory overview';
};
