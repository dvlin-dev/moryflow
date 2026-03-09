/**
 * [DEFINES]: quick chat IPC 类型（窗口可见状态 + 绑定 session）
 * [USED_BY]: main quick-chat-window, preload bridge, renderer quick chat
 * [POS]: quick chat 合同单一事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export type QuickChatWindowState = {
  visible: boolean;
  focused: boolean;
  sessionId: string | null;
};

export type QuickChatSetSessionInput = {
  sessionId: string | null;
};
