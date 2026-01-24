/**
 * PC 端 ChatSession 实现
 *
 * 使用 agents-runtime 的 createSessionAdapter 创建 SDK Session 接口。
 * 这样可以保持与 Mobile 端的一致性，都使用 SessionStore 接口。
 *
 * 注意：本模块只负责 history 的 CRUD，不触发 uiMessages 更新。
 * uiMessages 由 chat-request.ts 单独管理。
 */

import { createSessionAdapter, type Session } from '@anyhunt/agents-runtime';
import { desktopSessionStore } from '../../chat-session-store/index.js';

/**
 * 创建 PC 端 ChatSession
 *
 * @param chatId - 会话 ID
 * @returns SDK Session 接口实例
 */
export const createChatSession = (chatId: string): Session => {
  return createSessionAdapter(chatId, desktopSessionStore);
};
