/**
 * [PROVIDES]: deep link 队列主窗口可用性判定
 * [DEPENDS]: Window-like `isDestroyed` 约定
 * [POS]: 主进程 deep link 排队/回放的窗口可用性事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
