/**
 * [PROVIDES]: buildAgentChatMessages
 * [DEPENDS]: ai UIMessage helpers
 * [POS]: Agent Playground Transport 的输入提取（与 SSE 协议解耦）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
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
