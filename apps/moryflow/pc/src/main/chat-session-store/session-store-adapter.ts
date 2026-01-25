/**
 * SessionStore 适配器
 * 将 PC 端的 chatSessionStore 适配为 agents-runtime 的 SessionStore 接口
 */

import type { SessionStore, ChatSessionSummary, TokenUsage } from '@anyhunt/agents-runtime';
import { chatSessionStore } from './handle.js';

/**
 * 会话元数据更新参数
 * 与 chatSessionStore.updateSessionMeta 的参数类型对齐
 */
interface SessionMetaUpdate {
  preferredModelId?: string;
  tokenUsage?: TokenUsage;
  mode?: ChatSessionSummary['mode'];
}

/**
 * 从 ChatSessionSummary 中提取可更新的元数据字段
 */
const extractMetaUpdates = (updates: Partial<ChatSessionSummary>): SessionMetaUpdate | null => {
  const meta: SessionMetaUpdate = {};
  let hasUpdates = false;

  if (updates.preferredModelId !== undefined) {
    meta.preferredModelId = updates.preferredModelId;
    hasUpdates = true;
  }

  if (updates.tokenUsage !== undefined) {
    meta.tokenUsage = updates.tokenUsage;
    hasUpdates = true;
  }

  if (updates.mode !== undefined) {
    meta.mode = updates.mode;
    hasUpdates = true;
  }

  return hasUpdates ? meta : null;
};

/**
 * 创建符合 SessionStore 接口的适配器
 * 将同步的 chatSessionStore 方法包装为异步（返回 Promise）
 */
export const desktopSessionStore: SessionStore = {
  async getSessions(): Promise<ChatSessionSummary[]> {
    return chatSessionStore.list();
  },

  async createSession(title?: string): Promise<ChatSessionSummary> {
    return chatSessionStore.create({ title });
  },

  async updateSession(id: string, updates: Partial<ChatSessionSummary>): Promise<void> {
    // 处理 title 更新
    if (updates.title !== undefined) {
      chatSessionStore.rename(id, updates.title);
    }

    // 处理其他元数据更新
    const metaUpdates = extractMetaUpdates(updates);
    if (metaUpdates) {
      chatSessionStore.updateSessionMeta(id, metaUpdates);
    }
  },

  async deleteSession(id: string): Promise<void> {
    chatSessionStore.delete(id);
  },

  async getHistory(chatId: string) {
    return chatSessionStore.getHistory(chatId);
  },

  async appendHistory(chatId: string, items) {
    chatSessionStore.appendHistory(chatId, items);
  },

  async popHistory(chatId: string) {
    return chatSessionStore.popHistory(chatId);
  },

  async clearHistory(chatId: string) {
    chatSessionStore.clearHistory(chatId);
  },
};
