/**
 * Mobile 端会话存储
 *
 * 实现 SessionStore 接口，管理聊天会话和历史记录。
 * 使用 AsyncStorage 持久化存储。
 *
 * 与 PC 端 chat-session-store 对应。
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { AgentInputItem } from '@moryflow/agents'
import type { UIMessage } from 'ai'
import type { SessionStore, ChatSessionSummary } from '@moryflow/agents-runtime'

// ============ 常量 ============

const SESSIONS_KEY = 'chat_sessions'
const HISTORY_PREFIX = 'chat_history_'
const UI_MESSAGES_PREFIX = 'chat_ui_messages_'
/** 会话标题最大长度 */
const MAX_TITLE_LENGTH = 30

// ============ AgentInputItem 类型定义（简化版）============

interface AgentMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type?: string; text?: string }>
}

/**
 * 类型守卫：检查 item 是否为 AgentMessage
 */
function isAgentMessage(item: unknown): item is AgentMessage {
  if (!item || typeof item !== 'object') return false
  const obj = item as Record<string, unknown>
  if (obj.role !== 'user' && obj.role !== 'assistant') return false
  if (obj.content !== undefined && typeof obj.content !== 'string' && !Array.isArray(obj.content)) {
    return false
  }
  return true
}

// ============ 转换函数 ============

/**
 * 将 agent 历史记录转换为可展示的 UI 消息
 * 与 PC 端 chat-session-store/ui-message.ts 保持一致
 */
function agentHistoryToUiMessages(sessionId: string, history: AgentInputItem[]): UIMessage[] {
  return history
    .map((item, index) => convertAgentMessageToUiMessage(sessionId, index, item))
    .filter((message): message is UIMessage => message !== null)
}

function convertAgentMessageToUiMessage(
  sessionId: string,
  index: number,
  item: AgentInputItem
): UIMessage | null {
  if (!isAgentMessage(item)) {
    return null
  }

  const candidate = item

  const parts: UIMessage['parts'] = []

  // 处理 content 为字符串的情况（用户消息可能是这种格式）
  if (typeof candidate.content === 'string') {
    if (candidate.content.trim()) {
      parts.push({ type: 'text', text: candidate.content })
    }
  } else if (Array.isArray(candidate.content)) {
    // 处理 content 为数组的情况
    for (const entry of candidate.content) {
      if (!entry || typeof entry !== 'object') {
        continue
      }
      const text = typeof entry.text === 'string' ? entry.text : null
      if (!text) {
        continue
      }
      if (
        entry.type === 'input_text' ||
        entry.type === 'output_text' ||
        entry.type === 'reasoning_text' ||
        entry.type === 'text'
      ) {
        parts.push({ type: 'text', text })
      }
    }
  }

  if (parts.length === 0) {
    return null
  }
  return {
    id: `${sessionId}-${index}`,
    role: candidate.role,
    parts,
  }
}

// ============ 会话存储实现 ============

/**
 * Mobile 会话存储实现
 */
class MobileSessionStoreImpl implements SessionStore {
  /**
   * 获取所有会话列表
   */
  async getSessions(): Promise<ChatSessionSummary[]> {
    const stored = await AsyncStorage.getItem(SESSIONS_KEY)
    if (!stored) return []
    try {
      const parsed = JSON.parse(stored) as ChatSessionSummary[]
      // 过滤掉损坏的会话（title 不是字符串）
      const valid = parsed.filter(
        (s) => s && typeof s.id === 'string' && typeof s.title === 'string'
      )
      // 如果有损坏数据，保存清理后的结果
      if (valid.length !== parsed.length) {
        console.warn('[SessionStore] Cleaned', parsed.length - valid.length, 'corrupted sessions')
        await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(valid))
      }
      return valid
    } catch {
      return []
    }
  }

  /**
   * 创建新会话
   */
  async createSession(title: string = '新对话'): Promise<ChatSessionSummary> {
    const sessions = await this.getSessions()
    const now = Date.now()
    const session: ChatSessionSummary = {
      id: randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
    }
    sessions.unshift(session)
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    return session
  }

  /**
   * 更新会话
   */
  async updateSession(id: string, updates: Partial<ChatSessionSummary>): Promise<void> {
    const sessions = await this.getSessions()
    const index = sessions.findIndex((s) => s.id === id)
    if (index >= 0) {
      sessions[index] = {
        ...sessions[index],
        ...updates,
        updatedAt: Date.now(),
      }
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(id: string): Promise<void> {
    const sessions = await this.getSessions()
    const filtered = sessions.filter((s) => s.id !== id)
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered))
    await AsyncStorage.removeItem(`${HISTORY_PREFIX}${id}`)
  }

  /**
   * 获取会话历史
   */
  async getHistory(chatId: string): Promise<AgentInputItem[]> {
    const stored = await AsyncStorage.getItem(`${HISTORY_PREFIX}${chatId}`)
    if (!stored) return []
    try {
      return JSON.parse(stored) as AgentInputItem[]
    } catch {
      return []
    }
  }

  /**
   * 追加历史
   */
  async appendHistory(chatId: string, items: AgentInputItem[]): Promise<void> {
    const history = await this.getHistory(chatId)
    history.push(...items)
    await AsyncStorage.setItem(`${HISTORY_PREFIX}${chatId}`, JSON.stringify(history))

    // 更新会话的 updatedAt
    await this.updateSession(chatId, {})
  }

  /**
   * 弹出最后一条历史
   */
  async popHistory(chatId: string): Promise<AgentInputItem | undefined> {
    const history = await this.getHistory(chatId)
    const item = history.pop()
    await AsyncStorage.setItem(`${HISTORY_PREFIX}${chatId}`, JSON.stringify(history))
    return item
  }

  /**
   * 清空历史
   */
  async clearHistory(chatId: string): Promise<void> {
    await AsyncStorage.removeItem(`${HISTORY_PREFIX}${chatId}`)
  }

  /**
   * 根据第一条消息生成标题
   */
  async generateTitle(chatId: string): Promise<string> {
    const history = await this.getHistory(chatId)
    // AgentInputItem 是联合类型，需要检查是否为用户消息
    // UserMessageItem: { role: 'user', content: string | UserContent[] }
    const firstUserMessage = history.find((item) => {
      // 检查是否为消息类型（没有 type 字段或 type 为 'message'）
      // 并且 role 为 'user'
      if ('role' in item && item.role === 'user') {
        return true
      }
      return false
    })

    if (firstUserMessage && 'content' in firstUserMessage) {
      const content = firstUserMessage.content
      // content 可能是 string 或 UserContent[]
      if (typeof content === 'string') {
        const trimmed = content.trim()
        return trimmed.length > MAX_TITLE_LENGTH ? trimmed.substring(0, MAX_TITLE_LENGTH) + '...' : trimmed
      }
      // 如果是数组，找第一个 input_text 类型的内容
      if (Array.isArray(content)) {
        const textContent = content.find((c) => c.type === 'input_text')
        if (textContent && 'text' in textContent) {
          const text = textContent.text.trim()
          return text.length > MAX_TITLE_LENGTH ? text.substring(0, MAX_TITLE_LENGTH) + '...' : text
        }
      }
    }
    return '新对话'
  }

  /**
   * 获取会话的 UI 消息（用于 UI 渲染）
   * 如果没有保存的 uiMessages，则从 history 转换生成
   */
  async getUiMessages(chatId: string): Promise<UIMessage[]> {
    // 先尝试读取已保存的 uiMessages
    const stored = await AsyncStorage.getItem(`${UI_MESSAGES_PREFIX}${chatId}`)
    if (stored) {
      try {
        const messages = JSON.parse(stored) as UIMessage[]
        if (messages.length > 0) {
          return messages
        }
      } catch {
        // 解析失败，fallback 到从 history 转换
      }
    }
    // 从 history 转换生成
    const history = await this.getHistory(chatId)
    return agentHistoryToUiMessages(chatId, history)
  }

  /**
   * 保存 UI 消息
   */
  async saveUiMessages(chatId: string, messages: UIMessage[]): Promise<void> {
    await AsyncStorage.setItem(`${UI_MESSAGES_PREFIX}${chatId}`, JSON.stringify(messages))
    // 同时更新会话的 updatedAt
    await this.updateSession(chatId, {})
  }

  /**
   * 清空 UI 消息
   */
  async clearUiMessages(chatId: string): Promise<void> {
    await AsyncStorage.removeItem(`${UI_MESSAGES_PREFIX}${chatId}`)
  }

  /**
   * 删除所有会话和历史
   */
  async clearAll(): Promise<void> {
    const sessions = await this.getSessions()
    // 删除所有历史和 UI 消息
    for (const session of sessions) {
      await AsyncStorage.removeItem(`${HISTORY_PREFIX}${session.id}`)
      await AsyncStorage.removeItem(`${UI_MESSAGES_PREFIX}${session.id}`)
    }
    // 删除会话列表
    await AsyncStorage.removeItem(SESSIONS_KEY)
  }
}

/**
 * 单例实例
 */
export const mobileSessionStore = new MobileSessionStoreImpl()

/**
 * 快捷方法导出
 */
export const getSessions = () => mobileSessionStore.getSessions()
export const createSession = (title?: string) => mobileSessionStore.createSession(title)
export const updateSession = (id: string, updates: Partial<ChatSessionSummary>) =>
  mobileSessionStore.updateSession(id, updates)
export const deleteSession = (id: string) => mobileSessionStore.deleteSession(id)
export const getHistory = (chatId: string) => mobileSessionStore.getHistory(chatId)
export const appendHistory = (chatId: string, items: AgentInputItem[]) =>
  mobileSessionStore.appendHistory(chatId, items)
export const clearHistory = (chatId: string) => mobileSessionStore.clearHistory(chatId)
export const generateTitle = (chatId: string) => mobileSessionStore.generateTitle(chatId)

// UIMessage 相关导出
export const getUiMessages = (chatId: string) => mobileSessionStore.getUiMessages(chatId)
export const saveUiMessages = (chatId: string, messages: UIMessage[]) =>
  mobileSessionStore.saveUiMessages(chatId, messages)
export const clearUiMessages = (chatId: string) => mobileSessionStore.clearUiMessages(chatId)
