import type { FileUIPart } from 'ai';
import type { AgentAttachmentContext, AgentImageContent } from '../../../agent-runtime/index.js';
import { ATTACHMENT_MAX_CHARS, decodeDataUrl, isTextualMediaType } from './decodeAttachment.js';
import { writeAttachmentToVault } from './persistAttachment.js';

export { ATTACHMENT_MAX_CHARS } from './decodeAttachment.js';

export interface ProcessedAttachments {
  textContexts: AgentAttachmentContext[];
  images: AgentImageContent[];
}

export const processAttachments = async (parts: FileUIPart[]): Promise<ProcessedAttachments> => {
  const textContexts: AgentAttachmentContext[] = [];
  const images: AgentImageContent[] = [];
  for (const part of parts) {
    const partMediaType = part.mediaType ?? '';
    if (partMediaType.startsWith('image/') && partMediaType !== 'image/svg+xml' && part.url) {
      images.push({
        url: part.url,
        mediaType: partMediaType,
        filename: part.filename,
      });
      const decoded = decodeDataUrl(part);
      if (decoded) {
        void writeAttachmentToVault(part.filename, decoded.buffer).catch((error) => {
          console.error('[chat] failed to persist image attachment', error);
        });
      }
      continue;
    }

    const decoded = decodeDataUrl(part);
    if (!decoded) {
      continue;
    }
    const { mediaType, buffer } = decoded;
    if (isTextualMediaType(mediaType)) {
      const text = buffer.toString('utf8');
      if (!text.trim()) {
        continue;
      }
      if (text.length <= ATTACHMENT_MAX_CHARS) {
        textContexts.push({
          filename: part.filename,
          mediaType,
          content: text,
          truncated: false,
        });
      } else {
        const { relative } = await writeAttachmentToVault(part.filename, buffer);
        textContexts.push({
          filename: part.filename,
          mediaType,
          content: `${text.slice(0, ATTACHMENT_MAX_CHARS)}\n...(内容过长，剩余部分已保存至 ${relative})`,
          truncated: true,
          filePath: relative,
        });
      }
      continue;
    }

    const { relative } = await writeAttachmentToVault(part.filename, buffer);
    textContexts.push({
      filename: part.filename,
      mediaType,
      filePath: relative,
    });
  }
  return { textContexts, images };
};
