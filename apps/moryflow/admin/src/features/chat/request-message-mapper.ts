/**
 * [PROVIDES]: UIMessage(parts) -> text-only ChatCompletionMessage 映射
 * [DEPENDS]: @moryflow/ui/ai/message(splitMessageParts), chat store/api types
 * [POS]: Chat 请求序列化事实源（显式过滤空内容）
 */

import { splitMessageParts } from '@moryflow/ui/ai/message';
import type { ChatCompletionMessage } from './api';
import type { ChatMessage } from './store';

export function serializeMessageTextContent(message: ChatMessage): string {
  return splitMessageParts(message.parts).messageText.trim();
}

export function mapToChatCompletionMessages(messages: ChatMessage[]): ChatCompletionMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      content: serializeMessageTextContent(message),
    }))
    .filter((message) => message.content.length > 0);
}
