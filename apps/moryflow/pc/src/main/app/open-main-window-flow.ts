/**
 * [INPUT]: createOrFocusMainWindow + flushPendingDeepLinks 回调
 * [OUTPUT]: openMainWindowAndFlushDeepLinks - 打开主窗口后统一 flush 深链队列
 * [POS]: 主窗口打开路径统一编排（启动/激活/菜单栏）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

type OpenMainWindowFlowDeps = {
  createOrFocusMainWindow: () => Promise<unknown>;
  flushPendingDeepLinks: () => void;
};

export const createOpenMainWindowWithDeepLinkFlush = (deps: OpenMainWindowFlowDeps) => {
  return async () => {
    await deps.createOrFocusMainWindow();
    deps.flushPendingDeepLinks();
  };
};
