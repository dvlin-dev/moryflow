import type { FileUIPart } from 'ai';

export const TEXTUAL_MEDIA_TYPES = [/^text\//i, /json/i, /xml/i, /yaml/i, /\+json/i, /javascript/i];
export const ATTACHMENT_MAX_CHARS = 32 * 1024;

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
