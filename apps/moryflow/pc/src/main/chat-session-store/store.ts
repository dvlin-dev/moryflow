import Store from 'electron-store';
import type { UIMessage } from 'ai';
import { isFileUIPart } from 'ai';
import {
  DEFAULT_STORE,
  STORE_NAME,
  type ChatSessionStoreShape,
  type PersistedChatSession,
} from './const.js';

const store = new Store<ChatSessionStoreShape>({
  name: STORE_NAME,
  defaults: DEFAULT_STORE,
});

type MigrationResult = {
  sessions: Record<string, PersistedChatSession>;
  changed: boolean;
};

const migrateUiMessage = (message: UIMessage): { message: UIMessage; changed: boolean } => {
  let changed = false;
  let nextMessage = message;

  const rawMetadata = message.metadata;
  if (rawMetadata && typeof rawMetadata === 'object') {
    const metadata = rawMetadata as Record<string, unknown>;
    if (metadata.moryflow !== undefined) {
      const nextMetadata: Record<string, unknown> = { ...metadata };
      if (nextMetadata.chat === undefined) {
        nextMetadata.chat = metadata.moryflow;
      }
      delete nextMetadata.moryflow;
      changed = true;
      nextMessage = { ...nextMessage, metadata: nextMetadata };
    }
  }

  if (Array.isArray(message.parts)) {
    let partsChanged = false;
    const nextParts = message.parts.map((part) => {
      if (!isFileUIPart(part)) {
        return part;
      }
      const rawProviderMetadata = part.providerMetadata;
      if (!rawProviderMetadata || typeof rawProviderMetadata !== 'object') {
        return part;
      }
      const providerMetadata = rawProviderMetadata as Record<string, unknown>;
      if (providerMetadata.moryflow === undefined) {
        return part;
      }
      const nextProviderMetadata: Record<string, unknown> = { ...providerMetadata };
      if (nextProviderMetadata.chat === undefined) {
        nextProviderMetadata.chat = providerMetadata.moryflow;
      }
      delete nextProviderMetadata.moryflow;
      partsChanged = true;
      return {
        ...part,
        providerMetadata: nextProviderMetadata as typeof part.providerMetadata,
      };
    });
    if (partsChanged) {
      changed = true;
      nextMessage = { ...nextMessage, parts: nextParts };
    }
  }

  return { message: nextMessage, changed };
};

const migrateSessions = (sessions: Record<string, PersistedChatSession>): MigrationResult => {
  let changed = false;
  const nextSessions: Record<string, PersistedChatSession> = {};

  for (const [sessionId, session] of Object.entries(sessions)) {
    let sessionChanged = false;
    let nextSession = session;

    if (session.uiMessages && session.uiMessages.length > 0) {
      let messagesChanged = false;
      const nextMessages = session.uiMessages.map((message) => {
        const { message: nextMessage, changed: messageChanged } = migrateUiMessage(message);
        if (messageChanged) {
          messagesChanged = true;
        }
        return nextMessage;
      });

      if (messagesChanged) {
        sessionChanged = true;
        nextSession = { ...session, uiMessages: nextMessages };
      }
    }

    if (sessionChanged) {
      changed = true;
    }
    nextSessions[sessionId] = nextSession;
  }

  return { sessions: nextSessions, changed };
};

export const readSessions = () => {
  const sessions = store.get('sessions') ?? DEFAULT_STORE.sessions;
  const { sessions: migratedSessions, changed } = migrateSessions(sessions);
  if (changed) {
    store.set('sessions', migratedSessions);
  }
  return migratedSessions;
};

export const writeSessions = (sessions: Record<string, PersistedChatSession>) => {
  store.set('sessions', sessions);
};

export const takeSequence = () => {
  const current = store.get('sequence') ?? DEFAULT_STORE.sequence;
  store.set('sequence', current + 1);
  return current;
};

export const resetStore = () => {
  store.set('sessions', DEFAULT_STORE.sessions);
  store.set('sequence', DEFAULT_STORE.sequence);
};
