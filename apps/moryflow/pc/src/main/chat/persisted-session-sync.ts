import type { UIMessage } from 'ai';
import { chatSessionStore } from '../chat-session-store/index.js';
import { agentHistoryToUiMessages } from '../chat-session-store/ui-message.js';
import { broadcastMessageEvent, broadcastSessionEvent } from './broadcast.js';
import { sanitizePersistedUiMessages } from './ui-message-sanitizer.js';

const isTextLikePart = (part: UIMessage['parts'][number]): boolean => {
  return part.type === 'text' || part.type === 'reasoning';
};

const buildTextSignature = (message: UIMessage): string => {
  return (message.parts ?? [])
    .filter(isTextLikePart)
    .map((part) => {
      const text = 'text' in part && typeof part.text === 'string' ? part.text : '';
      if (part.type === 'reasoning') {
        return `reasoning:${text}`;
      }
      return `text:${text}`;
    })
    .join('\n');
};

const mergeUiMessagesPreservingRichParts = (input: {
  existingMessages: UIMessage[];
  rebuiltMessages: UIMessage[];
}): UIMessage[] => {
  return input.rebuiltMessages.map((rebuilt, index) => {
    const existing = input.existingMessages[index];
    if (!existing || existing.role !== rebuilt.role) {
      return rebuilt;
    }
    if (buildTextSignature(existing) !== buildTextSignature(rebuilt)) {
      return rebuilt;
    }

    const richParts = (existing.parts ?? []).filter((part) => !isTextLikePart(part));
    if (richParts.length === 0) {
      return {
        ...rebuilt,
        id: existing.id,
      };
    }
    return {
      ...rebuilt,
      id: existing.id,
      parts: [...rebuilt.parts, ...richParts],
    };
  });
};

export const syncPersistedConversationUiState = async (conversationId: string): Promise<void> => {
  const history = chatSessionStore.getHistory(conversationId);
  const rebuiltMessages = sanitizePersistedUiMessages(
    agentHistoryToUiMessages(conversationId, history)
  );
  const existingMessages = sanitizePersistedUiMessages(
    chatSessionStore.getUiMessages(conversationId)
  );
  const uiMessages = mergeUiMessagesPreservingRichParts({
    existingMessages,
    rebuiltMessages,
  });
  const summary = chatSessionStore.updateSessionMeta(conversationId, {
    uiMessages,
  });
  broadcastSessionEvent({ type: 'updated', session: summary });
  broadcastMessageEvent({
    type: 'snapshot',
    sessionId: conversationId,
    messages: uiMessages,
    persisted: true,
  });
};
