/**
 * [DEFINES]: Session/SessionStore/ChatSessionSummary 会话协议
 * [USED_BY]: PC/Mobile 端会话存储与运行时适配
 * [POS]: 运行时会话抽象入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentInputItem } from '@openai/agents-core';
import type { AgentAccessMode, TokenUsage } from './types';

/**
 * 会话摘要信息
 */
export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preferredModelId?: string;
  tokenUsage?: TokenUsage;
  mode?: AgentAccessMode;
}

/**
 * 会话接口（与 SDK 解耦的本地约束）
 */
export interface Session {
  getSessionId(): Promise<string>;
  getItems(limit?: number): Promise<AgentInputItem[]>;
  addItems(items: AgentInputItem[]): Promise<void>;
  popItem(): Promise<AgentInputItem | undefined>;
  clearSession(): Promise<void>;
}

/**
 * 会话存储接口
 * PC 和 Mobile 需要各自实现
 */
export interface SessionStore {
  /** 获取所有会话列表 */
  getSessions(): Promise<ChatSessionSummary[]>;
  /** 创建新会话 */
  createSession(title?: string): Promise<ChatSessionSummary>;
  /** 更新会话 */
  updateSession(id: string, updates: Partial<ChatSessionSummary>): Promise<void>;
  /** 删除会话 */
  deleteSession(id: string): Promise<void>;
  /** 获取会话历史 */
  getHistory(chatId: string): Promise<AgentInputItem[]>;
  /** 追加历史 */
  appendHistory(chatId: string, items: AgentInputItem[]): Promise<void>;
  /** 弹出最后一条历史 */
  popHistory(chatId: string): Promise<AgentInputItem | undefined>;
  /** 清空历史 */
  clearHistory(chatId: string): Promise<void>;
}

/**
 * 创建 SDK Session 适配器
 */
export const createSessionAdapter = (chatId: string, store: SessionStore): Session => ({
  async getSessionId() {
    return chatId;
  },

  async getItems(limit?: number) {
    const history = await store.getHistory(chatId);
    if (limit === undefined || limit >= history.length) {
      return history;
    }
    return history.slice(-limit);
  },

  async addItems(items: AgentInputItem[]) {
    await store.appendHistory(chatId, items);
  },

  async popItem() {
    return store.popHistory(chatId);
  },

  async clearSession() {
    await store.clearHistory(chatId);
  },
});
