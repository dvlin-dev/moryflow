/**
 * [PROVIDES]: extractPromptFromMessages
 * [DEPENDS]: ai UIMessage helpers
 * [POS]: Agent Playground Transport 的输入提取（与 SSE 协议解耦）
 */

import { isTextUIPart, type UIMessage } from 'ai';

export const extractPromptFromMessages = (messages: UIMessage[]): string => {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUser) return '';
  const textParts = lastUser.parts.filter(isTextUIPart);
  return textParts
    .map((part) => part.text)
    .join('\n')
    .trim();
};
