/**
 * [PROVIDES]: deep link 队列主窗口可用性判定
 * [DEPENDS]: Window-like `isDestroyed` 约定
 * [POS]: 主进程 deep link 排队/回放的窗口可用性事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type MainWindowLike = {
  isDestroyed: () => boolean;
};

export const hasMainWindowForDeepLink = (window: MainWindowLike | null): boolean => {
  if (!window) {
    return false;
  }
  return !window.isDestroyed();
};
