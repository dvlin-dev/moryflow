/**
 * [PROVIDES]: Memory Workbench 常量与错误提取
 * [DEPENDS]: -
 * [POS]: Renderer 侧 Memory 模块文案与 tab 定义
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export const MEMORY_PAGE_TITLE = 'Memory';
export const MEMORY_PAGE_SUBTITLE =
  'Search files and facts, review graph signals, and export scoped memory from one workbench.';

export const MEMORY_SEARCH_MIN_QUERY_LENGTH = 2;
export const MEMORY_SEARCH_LIMIT_PER_GROUP = 10;
export const MEMORY_GRAPH_QUERY_DEBOUNCE_MS = 180;

export const MEMORY_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'search', label: 'Search' },
  { value: 'facts', label: 'Facts' },
  { value: 'graph', label: 'Graph' },
  { value: 'exports', label: 'Exports' },
] as const;

export const extractMemoryErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Failed to load memory overview';
};
