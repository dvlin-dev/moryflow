/**
 * [PROVIDES]: buildRecentFilesList - MRU 规则（去重/置顶/截断）
 * [DEPENDS]: none
 * [POS]: workspace-settings 的纯函数工具
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

const MAX_RECENT_FILES = 3;

export const buildRecentFilesList = (current: string[], nextPath: string): string[] => {
  const filtered = current.filter((path) => path !== nextPath);
  return [nextPath, ...filtered].slice(0, MAX_RECENT_FILES);
};
