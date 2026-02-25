/**
 * [INPUT]: 会话标题/历史/模式更新（含默认 mode 注入）
 * [OUTPUT]: 会话摘要与历史变更
 * [POS]: PC 聊天会话存储核心实现
 * [UPDATE]: 2026-02-11 - 默认新会话标题固定为英文 "New thread"（不再使用中文序号）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { AgentInputItem } from '@openai/agents-core';
import type { UIMessage } from 'ai';
import type { AgentAccessMode } from '@moryflow/agents-runtime';
import type { ChatSessionSummary, TokenUsage } from '../../shared/ipc.js';
import { agentHistoryToUiMessages } from './ui-message.js';
import { type PersistedChatSession } from './const.js';
import { readSessions, resetStore, writeSessions } from './store.js';

const DEFAULT_SESSION_TITLE = 'New thread';

const normalizeTitle = (raw?: string | null) => {
  const trimmed = raw?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const toSummary = (session: PersistedChatSession): ChatSessionSummary => ({
  id: session.id,
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  preferredModelId: session.preferredModelId,
  tokenUsage: session.tokenUsage,
  mode: session.mode,
});

const sortByUpdatedAt = (sessions: PersistedChatSession[]) =>
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);

const ensureSession = (sessionId: string, sessions = readSessions()) => {
  const session = sessions[sessionId];
  if (!session) {
    throw new Error('未找到对应的对话，请新建后再试');
  }
  return session;
};

/**
 * 从 uiMessage ID 中提取 history 索引。
 * ID 格式为 `${sessionId}-${historyIndex}`
 */
const extractHistoryIndex = (messageId: string, sessionId: string): number => {
  const prefix = `${sessionId}-`;
  if (messageId.startsWith(prefix)) {
    const indexStr = messageId.slice(prefix.length);
    const index = parseInt(indexStr, 10);
    if (!isNaN(index)) {
      return index;
    }
  }
  // 回退：无法解析时返回 -1，调用方需要处理
  return -1;
};

/**
 * 统一更新指定会话并写回存储，避免重复读取/保存逻辑。
 */
const updateSession = (
  sessionId: string,
  updater: (session: PersistedChatSession) => PersistedChatSession | void
) => {
  const sessions = readSessions();
  const existing = ensureSession(sessionId, sessions);
  const result = updater(existing);
  const nextSession = (result ?? existing) as PersistedChatSession;
  sessions[sessionId] = nextSession;
  writeSessions(sessions);
  return nextSession;
};

export const chatSessionStore = {
  list(): ChatSessionSummary[] {
    const sessions = sortByUpdatedAt(Object.values(readSessions()));
    return sessions.map(toSummary);
  },
  create(input?: {
    title?: string;
    preferredModelId?: string;
    mode?: AgentAccessMode;
  }): ChatSessionSummary {
    const now = Date.now();
    const title = normalizeTitle(input?.title) ?? DEFAULT_SESSION_TITLE;
    const mode = input?.mode === 'full_access' || input?.mode === 'agent' ? input?.mode : 'agent';
    const session: PersistedChatSession = {
      id: randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
      mode,
      preferredModelId: input?.preferredModelId,
      history: [],
    };
    const sessions = readSessions();
    sessions[session.id] = session;
    writeSessions(sessions);
    return toSummary(session);
  },
  rename(sessionId: string, title: string): ChatSessionSummary {
    const normalized = normalizeTitle(title);
    if (!normalized) {
      throw new Error('对话标题不能为空');
    }
    const session = updateSession(sessionId, (existing) => {
      existing.title = normalized;
      existing.updatedAt = Date.now();
      return existing;
    });
    return toSummary(session);
  },
  delete(sessionId: string): void {
    const sessions = readSessions();
    if (!sessions[sessionId]) {
      throw new Error('对话不存在或已被删除');
    }
    delete sessions[sessionId];
    writeSessions(sessions);
  },
  getSummary(sessionId: string): ChatSessionSummary {
    const session = ensureSession(sessionId);
    return toSummary(session);
  },
  getHistory(sessionId: string): AgentInputItem[] {
    const session = ensureSession(sessionId);
    return session.history ?? [];
  },
  /**
   * 追加历史记录，不触发 uiMessages 更新。
   * 专为 SDK Session 接口设计。
   */
  appendHistory(sessionId: string, items: AgentInputItem[]): void {
    updateSession(sessionId, (existing) => {
      existing.history = [...(existing.history ?? []), ...items];
    });
  },
  /**
   * 弹出最后一条历史记录，不触发 uiMessages 更新。
   * 专为 SDK Session 接口设计。
   */
  popHistory(sessionId: string): AgentInputItem | undefined {
    let popped: AgentInputItem | undefined;
    updateSession(sessionId, (existing) => {
      const history = existing.history ?? [];
      if (history.length > 0) {
        popped = history[history.length - 1];
        existing.history = history.slice(0, -1);
      }
    });
    return popped;
  },
  /**
   * 清空历史记录，不触发 uiMessages 更新。
   * 专为 SDK Session 接口设计。
   */
  clearHistory(sessionId: string): void {
    updateSession(sessionId, (existing) => {
      existing.history = [];
      existing.uiMessages = undefined;
    });
  },
  getUiMessages(sessionId: string): UIMessage[] {
    const session = ensureSession(sessionId);
    if (session.uiMessages && session.uiMessages.length > 0) {
      return session.uiMessages;
    }
    return agentHistoryToUiMessages(sessionId, session.history ?? []);
  },
  /**
   * 更新会话元数据（uiMessages、preferredModelId、tokenUsage）。
   * history 由 ChatSession 通过 appendHistory/popHistory/clearHistory 管理。
   * tokenUsage 采用累积模式，每次请求的 usage 会累加到已有的 usage 上。
   */
  updateSessionMeta(
    sessionId: string,
    data: {
      uiMessages?: UIMessage[];
      preferredModelId?: string;
      tokenUsage?: TokenUsage;
      mode?: ChatSessionSummary['mode'];
    }
  ): ChatSessionSummary {
    const session = updateSession(sessionId, (existing) => {
      if (data.uiMessages) {
        existing.uiMessages = data.uiMessages;
      }
      if (data.preferredModelId) {
        existing.preferredModelId = data.preferredModelId;
      }
      if (data.mode !== undefined) {
        existing.mode = data.mode;
      }
      // 累积 token 使用量
      if (data.tokenUsage) {
        const prev = existing.tokenUsage ?? {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };
        existing.tokenUsage = {
          promptTokens: prev.promptTokens + data.tokenUsage.promptTokens,
          completionTokens: prev.completionTokens + data.tokenUsage.completionTokens,
          totalTokens: prev.totalTokens + data.tokenUsage.totalTokens,
        };
      }
      existing.updatedAt = Date.now();
    });
    return toSummary(session);
  },
  reset(): void {
    resetStore();
  },

  /**
   * 截断历史到指定索引（保留 index 及之前的内容）。
   * 同时清空 uiMessages，下次获取时会从 history 重新生成。
   */
  truncateAt(sessionId: string, index: number): void {
    updateSession(sessionId, (existing) => {
      const history = existing.history ?? [];
      if (index < 0 || index >= history.length) {
        return;
      }
      existing.history = history.slice(0, index + 1);
      existing.uiMessages = undefined;
      existing.updatedAt = Date.now();
    });
  },

  /**
   * 替换指定索引消息的文本内容。
   * 仅支持 user 角色的消息。
   */
  replaceMessageAt(sessionId: string, index: number, newContent: string): void {
    updateSession(sessionId, (existing) => {
      const history = existing.history ?? [];
      if (index < 0 || index >= history.length) {
        return;
      }
      const item = history[index] as {
        role?: string;
        content?: string | Array<{ type?: string; text?: string }>;
      };
      if (item.role !== 'user') {
        return;
      }
      // 处理 content 为字符串的情况
      if (typeof item.content === 'string') {
        item.content = newContent;
      } else if (Array.isArray(item.content)) {
        // 替换第一个 input_text 的内容
        const textPart = item.content.find((p) => p.type === 'input_text');
        if (textPart) {
          textPart.text = newContent;
        }
      }
      existing.uiMessages = undefined;
      existing.updatedAt = Date.now();
    });
  },

  /**
   * 从指定位置分支出新会话。
   * atIndex 是 uiMessages 的索引，同时截断 history 和 uiMessages。
   */
  fork(sessionId: string, atIndex: number): ChatSessionSummary {
    const sessions = readSessions();
    const source = ensureSession(sessionId, sessions);
    // 优先使用 uiMessages，如果没有则从 history 生成
    const sourceUiMessages =
      source.uiMessages && source.uiMessages.length > 0
        ? source.uiMessages
        : agentHistoryToUiMessages(sessionId, source.history ?? []);
    if (atIndex < 0 || atIndex >= sourceUiMessages.length) {
      throw new Error('分支位置超出范围');
    }
    const now = Date.now();
    const newSessionId = randomUUID();
    // 截断 uiMessages
    const forkedUiMessages = sourceUiMessages.slice(0, atIndex + 1);
    // 从 uiMessage ID 中提取对应的 history 索引
    // ID 格式为 `${sessionId}-${historyIndex}`
    const lastMessage = forkedUiMessages[forkedUiMessages.length - 1];
    const historyIndex = extractHistoryIndex(lastMessage.id, sessionId);
    if (historyIndex < 0) {
      throw new Error('无法解析消息索引');
    }
    const forkedHistory = (source.history ?? []).slice(0, historyIndex + 1);
    const newSession: PersistedChatSession = {
      id: newSessionId,
      title: `${source.title} (分支)`,
      createdAt: now,
      updatedAt: now,
      mode: source.mode,
      preferredModelId: source.preferredModelId,
      history: forkedHistory,
      // 保持原始 history 索引映射，只替换 sessionId 前缀
      uiMessages: forkedUiMessages.map((msg) => ({
        ...msg,
        id: msg.id.replace(sessionId, newSessionId),
      })),
    };
    sessions[newSession.id] = newSession;
    writeSessions(sessions);
    return toSummary(newSession);
  },
};
