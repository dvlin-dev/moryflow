/**
 * [PROVIDES]: deep link 队列窗口可用性判定（任一未销毁窗口即可处理）
 * [DEPENDS]: Window-like `isDestroyed` 约定
 * [POS]: 主进程 deep link 排队/回放的窗口可用性事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type DeepLinkWindowLike = {
  isDestroyed: () => boolean;
};

export const hasLiveWindowForDeepLink = (windows: readonly DeepLinkWindowLike[]): boolean => {
  return windows.some((window) => !window.isDestroyed());
};
