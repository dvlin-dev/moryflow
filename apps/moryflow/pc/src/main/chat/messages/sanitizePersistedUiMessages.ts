import type { UIMessage } from 'ai';

const hasRenderableParts = (message: UIMessage): boolean =>
  Array.isArray(message.parts) && message.parts.length > 0;

export const sanitizePersistedUiMessages = (messages: UIMessage[]): UIMessage[] => {
  return messages.filter((message) => {
    if (message.role !== 'assistant') {
      return true;
    }
    return hasRenderableParts(message);
  });
};
