import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';
import type { UIMessage } from 'ai';

const storage = new Map<string, string>();
const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    storage.delete(key);
  }),
  multiRemove: vi.fn(async (keys: string[]) => {
    for (const key of keys) {
      storage.delete(key);
    }
  }),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'session-1'),
}));

import { mobileSessionStore, onSessionEvent } from '../session-store';

const HISTORY_KEY = 'chat_history_session-1';
const UI_MESSAGES_KEY = 'chat_ui_messages_session-1';

const createUserHistoryItem = (): AgentInputItem =>
  ({
    role: 'user',
    content: 'hello',
  }) as AgentInputItem;

const createUiMessages = (): UIMessage[] => [
  {
    id: 'session-1-0',
    role: 'user',
    parts: [{ type: 'text', text: 'hello' }],
  },
];

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

describe('mobileSessionStore delete contract', () => {
  beforeEach(async () => {
    storage.clear();
    vi.clearAllMocks();
    await mobileSessionStore.clearAll();
  });

  it('rejects deleting a missing session and does not emit a deleted event', async () => {
    const events: Array<{ type: string; sessionId?: string }> = [];
    const dispose = onSessionEvent((event) => {
      events.push({
        type: event.type,
        sessionId: event.type === 'deleted' ? event.sessionId : event.session.id,
      });
    });

    await expect(mobileSessionStore.deleteSession('missing-session')).rejects.toThrow(
      'missing session: missing-session'
    );

    dispose();
    expect(events).toEqual([]);
  });

  it('deletes history and uiMessages together with the session', async () => {
    const session = await mobileSessionStore.createSession('Test');
    await mobileSessionStore.appendHistory(session.id, [createUserHistoryItem()]);
    await mobileSessionStore.saveUiMessages(session.id, createUiMessages());

    expect(storage.has(HISTORY_KEY)).toBe(true);
    expect(storage.has(UI_MESSAGES_KEY)).toBe(true);

    await mobileSessionStore.deleteSession(session.id);

    expect(await mobileSessionStore.getSession(session.id)).toBeNull();
    expect(storage.has(HISTORY_KEY)).toBe(false);
    expect(storage.has(UI_MESSAGES_KEY)).toBe(false);
  });

  it('serializes appendHistory against deleteSession so no orphan history remains', async () => {
    const session = await mobileSessionStore.createSession('Test');
    const historyWriteStarted = createDeferred();
    const releaseHistoryWrite = createDeferred();
    const originalSetItem = asyncStorageMock.setItem.getMockImplementation();

    asyncStorageMock.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === HISTORY_KEY) {
        historyWriteStarted.resolve();
        await releaseHistoryWrite.promise;
      }
      storage.set(key, value);
    });

    const appendPromise = mobileSessionStore.appendHistory(session.id, [createUserHistoryItem()]);
    await historyWriteStarted.promise;
    const deletePromise = mobileSessionStore.deleteSession(session.id);
    releaseHistoryWrite.resolve();

    await expect(appendPromise).resolves.toBeUndefined();
    await expect(deletePromise).resolves.toBeUndefined();
    expect(await mobileSessionStore.getSession(session.id)).toBeNull();
    expect(storage.has(HISTORY_KEY)).toBe(false);

    asyncStorageMock.setItem.mockImplementation(originalSetItem);
  });

  it('serializes saveUiMessages against deleteSession so no orphan uiMessages remain', async () => {
    const session = await mobileSessionStore.createSession('Test');
    const uiWriteStarted = createDeferred();
    const releaseUiWrite = createDeferred();
    const originalSetItem = asyncStorageMock.setItem.getMockImplementation();

    asyncStorageMock.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === UI_MESSAGES_KEY) {
        uiWriteStarted.resolve();
        await releaseUiWrite.promise;
      }
      storage.set(key, value);
    });

    const savePromise = mobileSessionStore.saveUiMessages(session.id, createUiMessages());
    await uiWriteStarted.promise;
    const deletePromise = mobileSessionStore.deleteSession(session.id);
    releaseUiWrite.resolve();

    await expect(savePromise).resolves.toBeUndefined();
    await expect(deletePromise).resolves.toBeUndefined();
    expect(await mobileSessionStore.getSession(session.id)).toBeNull();
    expect(storage.has(UI_MESSAGES_KEY)).toBe(false);

    asyncStorageMock.setItem.mockImplementation(originalSetItem);
  });
});
