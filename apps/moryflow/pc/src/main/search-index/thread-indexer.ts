/**
 * [INPUT]: 会话更新/删除事件与重建请求
 * [OUTPUT]: Threads 索引构建计数
 * [POS]: PC 全局搜索 Threads 索引器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createHash } from 'node:crypto';
import {
  LEGACY_UNSCOPED_VAULT_PATH,
  type PersistedChatSession,
} from '../chat-session-store/const.js';
import { readSessions } from '../chat-session-store/store.js';
import {
  deleteSearchDocumentById,
  deleteSearchDocumentsByIds,
  listSearchDocumentsByKind,
  upsertSearchDocument,
} from './store.js';

export type ThreadIndexer = {
  rebuild: (vaultPath: string) => Promise<number>;
  onSessionUpsert: (sessionId: string) => Promise<void>;
  onSessionDelete: (sessionId: string) => Promise<void>;
};

const MAX_MESSAGE_BYTES = 4 * 1024;
const MAX_SESSION_BYTES = 256 * 1024;

const TEXT_FIELD_KEYS = new Set([
  'text',
  'content',
  'summary',
  'message',
  'output_text',
  'input_text',
  'reasoning',
  'title',
  'name',
  'arguments',
  'result',
]);

const BINARY_FIELD_KEYS = new Set(['bytes', 'blob', 'binary', 'base64', 'audio', 'image', 'video']);

const buildThreadDocId = (sessionId: string) => `thread:${sessionId}`;

const buildDigest = (title: string, body: string) =>
  createHash('sha1').update(`${title}\n${body}`).digest('hex');

const truncateUtf8 = (text: string, maxBytes: number) => {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) {
    return text;
  }
  let bytes = 0;
  let output = '';
  for (const char of text) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (bytes + charBytes > maxBytes) {
      break;
    }
    output += char;
    bytes += charBytes;
  }
  return output;
};

const collectText = (value: unknown, fragments: string[]) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      fragments.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectText(item, fragments);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (BINARY_FIELD_KEYS.has(lowerKey)) {
      continue;
    }

    if (TEXT_FIELD_KEYS.has(lowerKey)) {
      collectText(nested, fragments);
      continue;
    }

    if (typeof nested === 'string' || Array.isArray(nested) || typeof nested === 'object') {
      collectText(nested, fragments);
    }
  }
};

const extractMessageText = (message: unknown) => {
  const fragments: string[] = [];

  if (message && typeof message === 'object') {
    const role = (message as { role?: unknown }).role;
    if (typeof role === 'string' && role.trim().length > 0) {
      fragments.push(role);
    }
  }

  collectText(message, fragments);
  const merged = fragments.join('\n').trim();
  if (!merged) {
    return '';
  }

  return truncateUtf8(merged, MAX_MESSAGE_BYTES);
};

export const extractSessionBodyForSearch = (session: PersistedChatSession) => {
  const history = Array.isArray(session.history) ? session.history : [];
  let remaining = MAX_SESSION_BYTES;
  const chunks: string[] = [];

  for (const message of history) {
    if (remaining <= 0) {
      break;
    }

    const messageText = extractMessageText(message);
    if (!messageText) {
      continue;
    }

    const clipped = truncateUtf8(messageText, remaining);
    if (!clipped) {
      continue;
    }

    chunks.push(clipped);
    remaining -= Buffer.byteLength(clipped, 'utf8');
  }

  return chunks.join('\n\n');
};

const upsertSessionDocument = (session: PersistedChatSession) => {
  if (session.vaultPath === LEGACY_UNSCOPED_VAULT_PATH) {
    deleteSearchDocumentById(buildThreadDocId(session.id));
    return;
  }

  const body = extractSessionBodyForSearch(session);
  upsertSearchDocument({
    docId: buildThreadDocId(session.id),
    kind: 'thread',
    vaultPath: session.vaultPath,
    entityKey: session.id,
    title: session.title,
    body,
    updatedAt: session.updatedAt,
    digest: buildDigest(session.title, body),
    sessionId: session.id,
  });
};

const syncRemovedThreads = (vaultPath: string, activeDocIds: Set<string>) => {
  const existing = listSearchDocumentsByKind('thread', vaultPath);
  const staleDocIds = existing
    .filter((document) => !activeDocIds.has(document.docId))
    .map((document) => document.docId);
  deleteSearchDocumentsByIds(staleDocIds);
};

export const createThreadIndexer = (): ThreadIndexer => {
  return {
    async rebuild(vaultPath: string) {
      const sessions = Object.values(readSessions()).filter(
        (session) =>
          session.vaultPath === vaultPath && session.vaultPath !== LEGACY_UNSCOPED_VAULT_PATH
      );

      const activeDocIds = new Set<string>();
      for (const session of sessions) {
        activeDocIds.add(buildThreadDocId(session.id));
        upsertSessionDocument(session);
      }

      syncRemovedThreads(vaultPath, activeDocIds);
      return sessions.length;
    },

    async onSessionUpsert(sessionId: string) {
      const session = readSessions()[sessionId];
      if (!session) {
        deleteSearchDocumentById(buildThreadDocId(sessionId));
        return;
      }

      upsertSessionDocument(session);
    },

    async onSessionDelete(sessionId: string) {
      deleteSearchDocumentById(buildThreadDocId(sessionId));
    },
  };
};
