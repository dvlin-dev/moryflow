/**
 * SessionStore 适配器
 * 将 PC 端的 chatSessionStore 适配为 agents-runtime 的 SessionStore 接口
 */

import type { SessionStore, ChatSessionSummary } from '@moryflow/agents-runtime';
import { chatSessionStore } from './handle.js';
import { getStoredVault } from '../vault.js';
import { resolveChatSessionProfileKey } from './scope.js';

/**
 * 创建符合 SessionStore 接口的适配器
 * 将同步的 chatSessionStore 方法包装为异步（返回 Promise）
 */
export const desktopSessionStore: SessionStore = {
  async getSessions(): Promise<ChatSessionSummary[]> {
    const vault = await getStoredVault();
    if (!vault?.path) {
      return chatSessionStore.list();
    }
    const profileKey = await resolveChatSessionProfileKey(vault.path);
    return chatSessionStore.list({
      vaultPath: vault.path,
      profileKey,
    });
  },

  async createSession(title?: string): Promise<ChatSessionSummary> {
    const vault = await getStoredVault();
    if (!vault?.path) {
      throw new Error('No workspace selected.');
    }
    const profileKey = await resolveChatSessionProfileKey(vault.path);
    return chatSessionStore.create({ title, vaultPath: vault.path, profileKey });
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
