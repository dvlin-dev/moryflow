/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionsMock = vi.hoisted(() => ({
  value: {} as Record<string, any>,
}));

vi.mock('../chat-session-store/store.js', () => ({
  readSessions: () => sessionsMock.value,
}));

const upsertSearchDocumentMock = vi.hoisted(() => vi.fn());
const deleteSearchDocumentByIdMock = vi.hoisted(() => vi.fn());
const deleteSearchDocumentsByIdsMock = vi.hoisted(() => vi.fn());
const listSearchDocumentsByKindMock = vi.hoisted(() => vi.fn());

vi.mock('./store.js', () => ({
  upsertSearchDocument: upsertSearchDocumentMock,
  deleteSearchDocumentById: deleteSearchDocumentByIdMock,
  deleteSearchDocumentsByIds: deleteSearchDocumentsByIdsMock,
  listSearchDocumentsByKind: listSearchDocumentsByKindMock,
}));

import { createThreadIndexer } from './thread-indexer.js';

describe('search-index thread-indexer', () => {
  beforeEach(() => {
    sessionsMock.value = {};
    upsertSearchDocumentMock.mockReset();
    deleteSearchDocumentByIdMock.mockReset();
    deleteSearchDocumentsByIdsMock.mockReset();
    listSearchDocumentsByKindMock.mockReset();
  });

  it('rebuild 仅索引当前 vault 线程', async () => {
    sessionsMock.value = {
      'session-a': {
        id: 'session-a',
        title: 'A',
        createdAt: 1,
        updatedAt: 1,
        vaultPath: '/vault',
        history: [{ role: 'user', content: 'hello' }],
        mode: 'agent',
      },
      'session-b': {
        id: 'session-b',
        title: 'B',
        createdAt: 1,
        updatedAt: 1,
        vaultPath: '/other',
        history: [{ role: 'user', content: 'world' }],
        mode: 'agent',
      },
    };
    listSearchDocumentsByKindMock.mockReturnValue([]);

    const indexer = createThreadIndexer();
    const count = await indexer.rebuild('/vault');

    expect(count).toBe(1);
    expect(upsertSearchDocumentMock).toHaveBeenCalledTimes(1);
    expect(upsertSearchDocumentMock.mock.calls[0]?.[0]?.sessionId).toBe('session-a');
  });

  it('onSessionUpsert 对超长消息执行截断并保留 tool 文本', async () => {
    sessionsMock.value = {
      'session-a': {
        id: 'session-a',
        title: 'A',
        createdAt: 1,
        updatedAt: 1,
        vaultPath: '/vault',
        history: [
          {
            role: 'tool',
            content: [
              {
                type: 'output_text',
                text: 'tool-result',
              },
            ],
          },
          {
            role: 'assistant',
            content: 'x'.repeat(10_000),
          },
        ],
        mode: 'agent',
      },
    };

    const indexer = createThreadIndexer();
    await indexer.onSessionUpsert('session-a');

    expect(upsertSearchDocumentMock).toHaveBeenCalledTimes(1);
    const payload = upsertSearchDocumentMock.mock.calls[0]?.[0];
    expect(typeof payload?.body).toBe('string');
    expect(payload?.body).toContain('tool-result');
    expect(Buffer.byteLength(payload?.body ?? '', 'utf8')).toBeLessThanOrEqual(256 * 1024);
  });

  it('onSessionDelete 清理索引', async () => {
    const indexer = createThreadIndexer();

    await indexer.onSessionDelete('session-a');

    expect(deleteSearchDocumentByIdMock).toHaveBeenCalledWith('thread:session-a');
  });
});
