import type { AgentAttachmentContext, AgentChatContext, AgentImageContent } from './types';

/**
 * 将结构化上下文信息和附件注入到用户输入中
 */
export const applyContextToInput = (
  input: string,
  context?: AgentChatContext,
  attachments?: AgentAttachmentContext[]
): string => {
  const contextBlocks: string[] = [];

  if (context?.filePath) {
    contextBlocks.push(`Current file: ${context.filePath}`);
  }

  if (context?.selectedText) {
    contextBlocks.push(`User-selected text:\n${context.selectedText}`);
  }

  if (attachments && attachments.length > 0) {
    const chunks = attachments.map((attachment, index) => {
      const label =
        attachment.filename ||
        `Attachment ${index + 1}${attachment.mediaType ? ` (${attachment.mediaType})` : ''}`;
      const lines = [label];

      if (attachment.filePath) {
        lines.push(`Saved to Vault path: ${attachment.filePath}`);
        lines.push('To view full content, call read_file on this path.');
      }

      if (attachment.content) {
        const truncatedSuffix = attachment.truncated ? '\n...(attachment content truncated)' : '';
        lines.push(`Attachment content:\n${attachment.content}${truncatedSuffix}`);
      }

      return lines.join('\n');
    });

    contextBlocks.push(`User-provided attachments for reference:\n${chunks.join('\n\n')}`);
  }

  if (contextBlocks.length === 0) {
    return input;
  }

  return `${contextBlocks.join('\n\n')}\n\n=== User input ===\n${input}`;
};

export const buildUserContent = (
  textInput: string,
  images?: AgentImageContent[]
):
  | string
  | Array<
      { type: 'input_text'; text: string } | { type: 'input_image'; image: string; detail?: string }
    > => {
  if (!images || images.length === 0) {
    return textInput;
  }
  return [
    { type: 'input_text', text: textInput },
    ...images.map((img) => ({
      type: 'input_image' as const,
      image: img.url,
      ...(img.detail && { detail: img.detail }),
    })),
  ];
};
