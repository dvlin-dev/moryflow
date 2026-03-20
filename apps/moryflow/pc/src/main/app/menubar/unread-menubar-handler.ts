/**
 * [INPUT]: 聊天 message event、窗口可见性查询与 revision 去重依赖
 * [OUTPUT]: 主进程未读角标事件处理函数
 * [POS]: 菜单栏未读统计编排，规避 revision 先消费后异步判定的竞态
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export type UnreadMessageEvent = {
  type: 'snapshot' | 'deleted';
  sessionId: string;
  revision: number;
  persisted?: boolean;
};

type CreateUnreadMenubarHandlerDeps = {
  getQuickChatVisibleState: () => Promise<{ visible: boolean }>;
  isMainWindowVisibleAndFocused: () => boolean;
  deleteSessionRevision: (sessionId: string) => void;
  consumeUnreadRevision: (sessionId: string, revision: number) => boolean;
  incrementUnreadCount: () => void;
  onError?: (error: unknown) => void;
};

export const createUnreadMenubarHandler = ({
  getQuickChatVisibleState,
  isMainWindowVisibleAndFocused,
  deleteSessionRevision,
  consumeUnreadRevision,
  incrementUnreadCount,
  onError,
}: CreateUnreadMenubarHandlerDeps) => {
  return (event: UnreadMessageEvent): void => {
    if (event.type === 'deleted') {
      deleteSessionRevision(event.sessionId);
      return;
    }
    if (event.persisted !== true) {
      return;
    }

    void getQuickChatVisibleState()
      .then((quickState) => {
        if (isMainWindowVisibleAndFocused() || quickState.visible) {
          return;
        }
        if (!consumeUnreadRevision(event.sessionId, event.revision)) {
          return;
        }
        incrementUnreadCount();
      })
      .catch((error) => {
        onError?.(error);
      });
  };
};
