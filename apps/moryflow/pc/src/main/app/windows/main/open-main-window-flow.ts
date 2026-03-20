/**
 * [INPUT]: createOrFocusMainWindow + flushPendingDeepLinks 回调
 * [OUTPUT]: openMainWindowAndFlushDeepLinks - 打开主窗口后统一 flush 深链队列
 * [POS]: 主窗口打开路径统一编排（启动/激活/菜单栏）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

type OpenMainWindowFlowDeps = {
  createOrFocusMainWindow: () => Promise<unknown>;
  flushPendingDeepLinks: () => void;
};

export const createOpenMainWindowWithDeepLinkFlush = (deps: OpenMainWindowFlowDeps) => {
  let pendingOpenFlow: Promise<void> | null = null;
  return async () => {
    if (!pendingOpenFlow) {
      pendingOpenFlow = (async () => {
        await deps.createOrFocusMainWindow();
        deps.flushPendingDeepLinks();
      })().finally(() => {
        pendingOpenFlow = null;
      });
    }
    await pendingOpenFlow;
  };
};
