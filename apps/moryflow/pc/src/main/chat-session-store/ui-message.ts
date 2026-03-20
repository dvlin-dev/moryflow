import type { AgentInputItem } from '@openai/agents-core';
import type { FileUIPart, UIMessage } from 'ai';
import type { AgentMessage } from './const.js';

/**
 * 将 agent 历史记录转换为可展示的 UI 消息，忽略不符合格式的内容。
 */
export const agentHistoryToUiMessages = (
  sessionId: string,
  history: AgentInputItem[]
): UIMessage[] => {
  return history
    .map((item, index) => convertAgentMessageToUiMessage(sessionId, index, item))
    .filter((message): message is UIMessage => message !== null);
};

const convertAgentMessageToUiMessage = (
  sessionId: string,
  index: number,
  item: AgentInputItem
): UIMessage | null => {
  const candidate = item as AgentMessage;
  if (!candidate || (candidate.role !== 'user' && candidate.role !== 'assistant')) {
    return null;
  }

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
      // Handle image content parts
      if (entry.type === 'input_image' && typeof entry.image === 'string') {
        const filePart: FileUIPart = {
          type: 'file',
          url: entry.image,
          mediaType: 'image/*',
        };
        parts.push(filePart);
        continue;
      }
      const text = typeof entry.text === 'string' ? entry.text : null;
      if (!text) {
        continue;
      }
      if (entry.type === 'reasoning_text') {
        parts.push({ type: 'reasoning', text, state: 'done' });
        continue;
      }
      if (entry.type === 'input_text' || entry.type === 'output_text' || entry.type === 'text') {
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
};
