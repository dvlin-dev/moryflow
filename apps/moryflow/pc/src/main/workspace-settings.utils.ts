/**
 * [PROVIDES]: buildRecentFilesList - MRU 规则（去重/置顶/截断）
 * [DEPENDS]: none
 * [POS]: workspace-settings 的纯函数工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const MAX_RECENT_FILES = 3;

export const buildRecentFilesList = (current: string[], nextPath: string): string[] => {
  const filtered = current.filter((path) => path !== nextPath);
  return [nextPath, ...filtered].slice(0, MAX_RECENT_FILES);
};
