/**
 * [PROVIDES]: buildAgentChatMessages
 * [DEPENDS]: ai UIMessage helpers
 * [POS]: Agent Playground Transport 的输入提取（与 SSE 协议解耦）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { isTextUIPart, type UIMessage } from 'ai';

export type AgentChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export const buildAgentChatMessages = (messages: UIMessage[]): AgentChatMessage[] => {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => {
      const text = message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('\n')
        .trim();
      if (!text) return null;
      return { role: message.role, content: text } as AgentChatMessage;
    })
    .filter((message): message is AgentChatMessage => Boolean(message));
};
