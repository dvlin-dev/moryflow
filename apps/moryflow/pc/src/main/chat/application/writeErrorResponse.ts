import type { UIMessage, UIMessageStreamWriter } from 'ai';

export const writeErrorResponse = (writer: UIMessageStreamWriter<UIMessage>, errorText: string) => {
  writer.write({ type: 'error', errorText });
};
