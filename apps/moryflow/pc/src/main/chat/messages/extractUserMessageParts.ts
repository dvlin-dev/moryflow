import type { FileUIPart, UIMessage } from 'ai';
import { isFileUIPart, isTextUIPart } from 'ai';

export const findLatestUserMessage = (messages: UIMessage[]): UIMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index] ?? null;
    }
  }
  return null;
};

export const extractUserText = (message: UIMessage): string | null => {
  const textParts =
    message.parts
      ?.filter(isTextUIPart)
      .map((part) => part.text)
      .filter(Boolean) ?? [];
  if (textParts.length === 0) {
    return null;
  }
  return textParts.join('\n');
};

export const extractUserAttachments = (message: UIMessage): FileUIPart[] => {
  return message.parts?.filter(isFileUIPart) ?? [];
};
