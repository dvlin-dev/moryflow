/**
 * [DEFINES]: quick chat IPC 类型（窗口可见状态 + 绑定 session）
 * [USED_BY]: main quick-chat-window, preload bridge, renderer quick chat
 * [POS]: quick chat 合同单一事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type QuickChatWindowState = {
  visible: boolean;
  focused: boolean;
  sessionId: string | null;
};

export type QuickChatSetSessionInput = {
  sessionId: string | null;
};
