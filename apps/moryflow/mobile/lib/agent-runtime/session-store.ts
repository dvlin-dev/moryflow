/**
 * Mobile 端会话存储
 *
 * 实现 SessionStore 接口，管理聊天会话和历史记录。
 * 使用 AsyncStorage 持久化存储。
 *
 * 与 PC 端 chat-session-store 对应。
 * [UPDATE]: 2026-03-07 - session 变更改为串行化执行，deleteSession 成为 authoritative delete（summary/history/uiMessages 同边界删除）
 * [UPDATE]: 2026-03-07 - 通用 session patch 已删除，改为 renameSession/setTaskState/touchSession 专用入口并对缺失 session fail-fast
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import type { AgentInputItem } from '@openai/agents-core';
import type { UIMessage } from 'ai';
import type { SessionStore, ChatSessionSummary, TaskState } from '@moryflow/agents-runtime';

// ============ 常量 ============

const SESSIONS_KEY = 'chat_sessions';
const HISTORY_PREFIX = 'chat_history_';
const UI_MESSAGES_PREFIX = 'chat_ui_messages_';
/** 会话标题最大长度 */
const MAX_TITLE_LENGTH = 30;

// ============ AgentInputItem 类型定义（简化版）============

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type?: string; text?: string }>;
}

type PersistedSession = Partial<ChatSessionSummary> & {
  mode?: unknown;
};

export type MobileSessionEvent =
  | { type: 'created'; session: ChatSessionSummary }
  | { type: 'updated'; session: ChatSessionSummary }
  | { type: 'deleted'; sessionId: string };

const sessionListeners = new Set<(event: MobileSessionEvent) => void>();

const createMissingSessionError = (sessionId: string) => new Error(`missing session: ${sessionId}`);

const emitSessionEvent = (event: MobileSessionEvent) => {
  for (const listener of sessionListeners) {
    listener(event);
  }
};

const isTaskState = (value: unknown): value is TaskState => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.items) || typeof record.updatedAt !== 'number') {
    return false;
  }
  return record.items.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const task = item as Record<string, unknown>;
    return (
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      (task.status === 'todo' || task.status === 'in_progress' || task.status === 'done') &&
      (task.note === undefined || typeof task.note === 'string')
    );
  });
};

function toSessionSummary(raw: PersistedSession): ChatSessionSummary | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.createdAt !== 'number' ||
    typeof raw.updatedAt !== 'number'
  ) {
    return null;
  }
  return {
    id: raw.id,
    title: raw.title,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    preferredModelId: typeof raw.preferredModelId === 'string' ? raw.preferredModelId : undefined,
    tokenUsage: raw.tokenUsage,
    taskState: isTaskState(raw.taskState) ? raw.taskState : undefined,
  };
}

/**
 * 类型守卫：检查 item 是否为 AgentMessage
 */
function isAgentMessage(item: unknown): item is AgentMessage {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  if (obj.role !== 'user' && obj.role !== 'assistant') return false;
  if (obj.content !== undefined && typeof obj.content !== 'string' && !Array.isArray(obj.content)) {
    return false;
  }
  return true;
}

// ============ 转换函数 ============

/**
 * 将 agent 历史记录转换为可展示的 UI 消息
 * 与 PC 端 chat-session-store/ui-message.ts 保持一致
 */
function agentHistoryToUiMessages(sessionId: string, history: AgentInputItem[]): UIMessage[] {
  return history
    .map((item, index) => convertAgentMessageToUiMessage(sessionId, index, item))
    .filter((message): message is UIMessage => message !== null);
}

function convertAgentMessageToUiMessage(
  sessionId: string,
  index: number,
  item: AgentInputItem
): UIMessage | null {
  if (!isAgentMessage(item)) {
    return null;
  }

  const candidate = item;

  const parts: UIMessage['parts'] = [];

  // 处理 content 为字符串的情况（用户消息可能是这种格式）
  if (typeof candidate.content === 'string') {
    if (candidate.content.trim()) {
      parts.push({ type: 'text', text: candidate.content });
    }
  } else if (Array.isArray(candidate.content)) {
    // 处理 content 为数组的情况
    for (const entry of candidate.content) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const text = typeof entry.text === 'string' ? entry.text : null;
      if (!text) {
        continue;
      }
      if (
        entry.type === 'input_text' ||
        entry.type === 'output_text' ||
        entry.type === 'reasoning_text' ||
        entry.type === 'text'
      ) {
        parts.push({ type: 'text', text });
      }
    }
  }

  if (parts.length === 0) {
    return null;
  }
  return {
    id: `${sessionId}-${index}`,
    role: candidate.role,
    parts,
  };
}

// ============ 会话存储实现 ============

/**
 * Mobile 会话存储实现
 */
class MobileSessionStoreImpl implements SessionStore {
  private mutationQueue: Promise<void> = Promise.resolve();

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release!: () => void;
    this.mutationQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async persistSessions(sessions: ChatSessionSummary[]): Promise<void> {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  private requireSessionIndex(sessions: ChatSessionSummary[], sessionId: string): number {
    const index = sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) {
      throw createMissingSessionError(sessionId);
    }
    return index;
  }

  private touchSessionInMemory(
    sessions: ChatSessionSummary[],
    sessionId: string
  ): ChatSessionSummary {
    const index = this.requireSessionIndex(sessions, sessionId);
    const next = {
      ...sessions[index],
      updatedAt: Date.now(),
    };
    sessions[index] = next;
    return next;
  }

  async getSession(id: string): Promise<ChatSessionSummary | null> {
    const sessions = await this.getSessions();
    return sessions.find((session) => session.id === id) ?? null;
  }

  /**
   * 获取所有会话列表
   */
  async getSessions(): Promise<ChatSessionSummary[]> {
    const stored = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as PersistedSession[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      let changed = false;
      const normalized: ChatSessionSummary[] = [];
      for (const raw of parsed) {
        const session = toSessionSummary(raw);
        if (!session) {
          changed = true;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(raw, 'mode')) {
          changed = true;
        }
        normalized.push(session);
      }
      if (changed) {
        console.warn(
          '[SessionStore] Cleaned',
          parsed.length - normalized.length,
          'corrupted or legacy sessions'
        );
        await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return [];
    }
  }

  /**
   * 创建新会话
   */
  async createSession(title: string = '新对话'): Promise<ChatSessionSummary> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      const now = Date.now();
      const session: ChatSessionSummary = {
        id: randomUUID(),
        title,
        createdAt: now,
        updatedAt: now,
      };
      sessions.unshift(session);
      await this.persistSessions(sessions);
      emitSessionEvent({ type: 'created', session });
      return session;
    });
  }

  /**
   * 重命名会话
   */
  async renameSession(id: string, title: string): Promise<ChatSessionSummary> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      throw new Error('对话标题不能为空');
    }
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      const index = this.requireSessionIndex(sessions, id);
      const next = {
        ...sessions[index],
        title: normalizedTitle,
        updatedAt: Date.now(),
      };
      sessions[index] = next;
      await this.persistSessions(sessions);
      emitSessionEvent({ type: 'updated', session: next });
      return next;
    });
  }

  /**
   * 持久化当前会话的 task snapshot。
   */
  async setTaskState(id: string, taskState: TaskState | undefined): Promise<ChatSessionSummary> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      const index = this.requireSessionIndex(sessions, id);
      const next = {
        ...sessions[index],
        updatedAt: Date.now(),
        ...(taskState ? { taskState } : {}),
      } as ChatSessionSummary;
      if (!taskState) {
        delete next.taskState;
      }
      sessions[index] = next;
      await this.persistSessions(sessions);
      emitSessionEvent({ type: 'updated', session: next });
      return next;
    });
  }

  /**
   * 刷新会话 updatedAt，用于 history / uiMessages 等同聚合变更。
   */
  async touchSession(id: string): Promise<ChatSessionSummary> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      const next = this.touchSessionInMemory(sessions, id);
      await this.persistSessions(sessions);
      emitSessionEvent({ type: 'updated', session: next });
      return next;
    });
  }

  /**
   * 删除会话
   */
  async deleteSession(id: string): Promise<void> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      const index = this.requireSessionIndex(sessions, id);
      sessions.splice(index, 1);
      await this.persistSessions(sessions);
      await AsyncStorage.multiRemove([`${HISTORY_PREFIX}${id}`, `${UI_MESSAGES_PREFIX}${id}`]);
      emitSessionEvent({ type: 'deleted', sessionId: id });
    });
  }

  /**
   * 获取会话历史
   */
  async getHistory(chatId: string): Promise<AgentInputItem[]> {
    const session = await this.getSession(chatId);
    if (!session) {
      return [];
    }
    const stored = await AsyncStorage.getItem(`${HISTORY_PREFIX}${chatId}`);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as AgentInputItem[];
    } catch {
      return [];
    }
  }

  /**
   * 追加历史
   */
  async appendHistory(chatId: string, items: AgentInputItem[]): Promise<void> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      this.requireSessionIndex(sessions, chatId);
      const history = await this.getHistory(chatId);
      history.push(...items);
      await AsyncStorage.setItem(`${HISTORY_PREFIX}${chatId}`, JSON.stringify(history));
      const next = this.touchSessionInMemory(sessions, chatId);
      await this.persistSessions(sessions);
      emitSessionEvent({ type: 'updated', session: next });
    });
  }

  /**
   * 弹出最后一条历史
   */
  async popHistory(chatId: string): Promise<AgentInputItem | undefined> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      this.requireSessionIndex(sessions, chatId);
      const history = await this.getHistory(chatId);
      const item = history.pop();
      await AsyncStorage.setItem(`${HISTORY_PREFIX}${chatId}`, JSON.stringify(history));
      return item;
    });
  }

  /**
   * 清空历史
   */
  async clearHistory(chatId: string): Promise<void> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      this.requireSessionIndex(sessions, chatId);
      await AsyncStorage.multiRemove([
        `${HISTORY_PREFIX}${chatId}`,
        `${UI_MESSAGES_PREFIX}${chatId}`,
      ]);
    });
  }

  /**
   * 根据第一条消息生成标题
   */
  async generateTitle(chatId: string): Promise<string> {
    const history = await this.getHistory(chatId);
    const firstUserMessage = history.find((item) => {
      if ('role' in item && item.role === 'user') {
        return true;
      }
      return false;
    });

    if (firstUserMessage && 'content' in firstUserMessage) {
      const content = firstUserMessage.content;
      if (typeof content === 'string') {
        const trimmed = content.trim();
        return trimmed.length > MAX_TITLE_LENGTH
          ? trimmed.substring(0, MAX_TITLE_LENGTH) + '...'
          : trimmed;
      }
      if (Array.isArray(content)) {
        const textContent = content.find((c) => c.type === 'input_text');
        if (textContent && 'text' in textContent) {
          const text = textContent.text.trim();
          return text.length > MAX_TITLE_LENGTH
            ? text.substring(0, MAX_TITLE_LENGTH) + '...'
            : text;
        }
      }
    }
    return '新对话';
  }

  /**
   * 获取会话的 UI 消息（用于 UI 渲染）
   * 如果没有保存的 uiMessages，则从 history 转换生成
   */
  async getUiMessages(chatId: string): Promise<UIMessage[]> {
    const session = await this.getSession(chatId);
    if (!session) {
      return [];
    }
    const stored = await AsyncStorage.getItem(`${UI_MESSAGES_PREFIX}${chatId}`);
    if (stored) {
      try {
        const messages = JSON.parse(stored) as UIMessage[];
        if (messages.length > 0) {
          return messages;
        }
      } catch {
        // 解析失败，fallback 到从 history 转换
      }
    }
    const history = await this.getHistory(chatId);
    return agentHistoryToUiMessages(chatId, history);
  }

  /**
   * 保存 UI 消息
   */
  async saveUiMessages(chatId: string, messages: UIMessage[]): Promise<void> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      this.requireSessionIndex(sessions, chatId);
      await AsyncStorage.setItem(`${UI_MESSAGES_PREFIX}${chatId}`, JSON.stringify(messages));
      const next = this.touchSessionInMemory(sessions, chatId);
      await this.persistSessions(sessions);
      emitSessionEvent({ type: 'updated', session: next });
    });
  }

  /**
   * 清空 UI 消息
   */
  async clearUiMessages(chatId: string): Promise<void> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      this.requireSessionIndex(sessions, chatId);
      await AsyncStorage.removeItem(`${UI_MESSAGES_PREFIX}${chatId}`);
    });
  }

  /**
   * 删除所有会话和历史
   */
  async clearAll(): Promise<void> {
    return this.runExclusive(async () => {
      const sessions = await this.getSessions();
      for (const session of sessions) {
        await AsyncStorage.removeItem(`${HISTORY_PREFIX}${session.id}`);
        await AsyncStorage.removeItem(`${UI_MESSAGES_PREFIX}${session.id}`);
      }
      await AsyncStorage.removeItem(SESSIONS_KEY);
    });
  }
}

/**
 * 单例实例
 */
export const mobileSessionStore = new MobileSessionStoreImpl();

/**
 * 快捷方法导出
 */
export const getSessions = () => mobileSessionStore.getSessions();
export const getSession = (id: string) => mobileSessionStore.getSession(id);
export const createSession = (title?: string) => mobileSessionStore.createSession(title);
export const renameSession = (id: string, title: string) =>
  mobileSessionStore.renameSession(id, title);
export const deleteSession = (id: string) => mobileSessionStore.deleteSession(id);
export const getHistory = (chatId: string) => mobileSessionStore.getHistory(chatId);
export const appendHistory = (chatId: string, items: AgentInputItem[]) =>
  mobileSessionStore.appendHistory(chatId, items);
export const clearHistory = (chatId: string) => mobileSessionStore.clearHistory(chatId);
export const generateTitle = (chatId: string) => mobileSessionStore.generateTitle(chatId);

// UIMessage 相关导出
export const getUiMessages = (chatId: string) => mobileSessionStore.getUiMessages(chatId);
export const saveUiMessages = (chatId: string, messages: UIMessage[]) =>
  mobileSessionStore.saveUiMessages(chatId, messages);
export const clearUiMessages = (chatId: string) => mobileSessionStore.clearUiMessages(chatId);
export const onSessionEvent = (listener: (event: MobileSessionEvent) => void) => {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};

// 导出转换函数供 compaction 使用
export { agentHistoryToUiMessages };
