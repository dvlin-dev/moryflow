import type { FileUIPart } from 'ai';
import type { ChatFileContextMetadata } from '@anyhunt/types';

import type { ModelGroup, ModelOption } from '../../models';

import { PREVIEW_CHAR_LIMIT, TEXTUAL_MEDIA_TYPES } from './const';

export const findModel = (groups: ModelGroup[], id?: string | null): ModelOption | undefined => {
  if (!id) {
    return undefined;
  }
  for (const group of groups) {
    for (const option of group.options) {
      if (option.id === id) {
        return option;
      }
    }
  }
  return undefined;
};

export const enrichFileMetadata = (file: FileUIPart): FileUIPart => {
  const metadata = { ...(file.providerMetadata as Record<string, unknown> | undefined) };
  const chat = { ...(metadata.chat as ChatFileContextMetadata | undefined) };
  chat.usedAsContext = true;

  if (isTextualMediaType(file.mediaType)) {
    const preview = extractPreviewFromDataUrl(file.url);
    if (preview) {
      chat.preview = preview.text;
      chat.previewTruncated = preview.truncated;
    }
  }

  metadata.chat = chat;
  return {
    ...file,
    providerMetadata: metadata as FileUIPart['providerMetadata'],
  };
};

export const isTextualMediaType = (mediaType?: string) => {
  if (!mediaType) {
    return false;
  }
  return TEXTUAL_MEDIA_TYPES.some((pattern) => pattern.test(mediaType));
};

export const extractPreviewFromDataUrl = (
  url?: string
): { text: string; truncated: boolean } | null => {
  if (!url?.startsWith('data:')) {
    return null;
  }
  const commaIndex = url.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }
  const meta = url.slice(5, commaIndex);
  const payload = url.slice(commaIndex + 1);
  const isBase64 = meta.includes(';base64');
  try {
    let text: string;
    if (isBase64 && typeof atob === 'function') {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      text = new TextDecoder().decode(bytes);
    } else {
      text = decodeURIComponent(payload);
    }
    if (!text.trim()) {
      return null;
    }
    const truncated = text.length > PREVIEW_CHAR_LIMIT;
    return {
      text: truncated ? `${text.slice(0, PREVIEW_CHAR_LIMIT)}\n...(内容过长，已截断)` : text,
      truncated,
    };
  } catch (error) {
    console.error('[chat-pane] failed to extract attachment preview', error);
    return null;
  }
};
