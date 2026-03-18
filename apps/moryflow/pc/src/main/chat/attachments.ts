import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FileUIPart } from 'ai';
import type { AgentAttachmentContext, AgentImageContent } from '../agent-runtime/index.js';
import { getStoredVault } from '../vault.js';

export const TEXTUAL_MEDIA_TYPES = [/^text\//i, /json/i, /xml/i, /yaml/i, /\+json/i, /javascript/i];
export const ATTACHMENT_MAX_CHARS = 32 * 1024;

const attachmentDirState: { root: string; dir: string } = { root: '', dir: '' };

const sanitizeFileName = (name?: string) => {
  if (!name || name.trim().length === 0) {
    return 'attachment';
  }
  return name.replace(/[\\/:\n\r\t]+/g, '-').slice(-64);
};

const ensureAttachmentDirectory = async () => {
  const vaultInfo = await getStoredVault();
  if (!vaultInfo) {
    throw new Error('尚未选择 Vault，无法处理附件');
  }
  const root = path.resolve(vaultInfo.path);
  const dir = path.join(root, '.moryflow', 'attachments');
  if (attachmentDirState.root !== root || attachmentDirState.dir !== dir) {
    attachmentDirState.root = root;
    attachmentDirState.dir = dir;
  }
  await mkdir(dir, { recursive: true });
  return { root, dir };
};

const writeAttachmentToVault = async (filename: string | undefined, buffer: Buffer) => {
  const { root, dir } = await ensureAttachmentDirectory();
  const safeName = sanitizeFileName(filename);
  const filePath = path.join(dir, `${Date.now()}-${randomUUID()}-${safeName}`);
  await writeFile(filePath, buffer);
  const relative = path.relative(root, filePath).split(path.sep).join('/');
  return { absolute: filePath, relative };
};

export const isTextualMediaType = (mediaType?: string) => {
  if (!mediaType) {
    return false;
  }
  return TEXTUAL_MEDIA_TYPES.some((pattern) => pattern.test(mediaType));
};

export const decodeDataUrl = (part: FileUIPart): { mediaType: string; buffer: Buffer } | null => {
  if (!part.url?.startsWith('data:')) {
    return null;
  }
  const commaIndex = part.url.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }
  const meta = part.url.slice(5, commaIndex);
  const payload = part.url.slice(commaIndex + 1);
  const isBase64 = meta.includes(';base64');
  try {
    const buffer = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
    const mediaType = meta.split(';')[0] || part.mediaType || 'application/octet-stream';
    return { mediaType, buffer };
  } catch (error) {
    console.error('[chat] failed to decode attachment', error);
    return null;
  }
};

export interface ProcessedAttachments {
  textContexts: AgentAttachmentContext[];
  images: AgentImageContent[];
}

export const processAttachments = async (parts: FileUIPart[]): Promise<ProcessedAttachments> => {
  const textContexts: AgentAttachmentContext[] = [];
  const images: AgentImageContent[] = [];
  for (const part of parts) {
    // Image check first — works for any URL scheme (data:, https:, file:, etc.)
    const partMediaType = part.mediaType ?? '';
    if (partMediaType.startsWith('image/') && part.url) {
      images.push({
        url: part.url,
        mediaType: partMediaType,
        filename: part.filename,
      });
      // Fire-and-forget disk write for data URLs (for tool access via read_file)
      const decoded = decodeDataUrl(part);
      if (decoded) {
        void writeAttachmentToVault(part.filename, decoded.buffer).catch((error) => {
          console.error('[chat] failed to persist image attachment', error);
        });
      }
      continue;
    }
    // Non-image: decode data URL for text processing
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
    } else {
      const { relative } = await writeAttachmentToVault(part.filename, buffer);
      textContexts.push({
        filename: part.filename,
        mediaType,
        filePath: relative,
      });
    }
  }
  return { textContexts, images };
};
