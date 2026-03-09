/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type AnyRecord = Record<string, unknown>;

const encodeCompositeKey = (parts: string[]) => JSON.stringify(parts);

const mockStoreState = vi.hoisted(() => ({
  value: undefined as AnyRecord | undefined,
}));

vi.mock('electron-store', () => {
  class MockStore<T extends AnyRecord> {
    constructor(options?: { defaults?: T }) {
      if (!mockStoreState.value) {
        mockStoreState.value = structuredClone((options?.defaults ?? {}) as AnyRecord);
      }
    }

    get store(): T {
      return (mockStoreState.value ?? {}) as T;
    }

    set store(value: T) {
      mockStoreState.value = structuredClone(value as AnyRecord);
    }
  }

  return {
    default: MockStore,
  };
});

describe('telegram persistence store', () => {
  beforeEach(() => {
    vi.resetModules();
    mockStoreState.value = undefined;
  });

  it('watermark 应支持按 accountId 读写覆盖', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    expect(await store.offsets.getSafeWatermark('default')).toBeNull();

    await store.offsets.setSafeWatermark('default', 12);
    await store.offsets.setSafeWatermark('default', 15);

    expect(await store.offsets.getSafeWatermark('default')).toBe(15);
    expect(await store.offsets.getSafeWatermark('secondary')).toBeNull();
  });

  it('conversation binding 应支持按 thread upsert 与查询', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    await store.conversationBindings.upsertByThread({
      channel: 'telegram',
      accountId: 'default',
      peerKey: 'peer-1',
      threadKey: 'thread-1',
      conversationId: 'conversation-1',
      updatedAt: '2026-03-10T00:00:00.000Z',
    });

    await store.conversationBindings.upsertByThread({
      channel: 'telegram',
      accountId: 'default',
      peerKey: 'peer-1',
      threadKey: 'thread-1',
      conversationId: 'conversation-2',
      updatedAt: '2026-03-10T00:05:00.000Z',
    });

    expect(
      await store.conversationBindings.getByThread({
        channel: 'telegram',
        accountId: 'default',
        peerKey: 'peer-1',
        threadKey: 'thread-1',
      })
    ).toEqual({
      channel: 'telegram',
      accountId: 'default',
      peerKey: 'peer-1',
      threadKey: 'thread-1',
      conversationId: 'conversation-2',
      updatedAt: '2026-03-10T00:05:00.000Z',
    });
  });

  it('sent message remember 不应写入持久化 store', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    await store.sentMessages.rememberSentMessage({
      accountId: 'default',
      chatId: 'chat-1',
      messageId: 'message-1',
      sentAt: '2026-03-10T00:00:00.000Z',
    });
    await store.sentMessages.rememberSentMessage({
      accountId: 'default',
      chatId: 'chat-1',
      messageId: 'message-1',
      sentAt: '2026-03-10T00:01:00.000Z',
    });

    const rawState = mockStoreState.value as AnyRecord;
    expect(rawState['sentMessagesByKey']).toBeUndefined();
  });

  it('复合 key 字段含 :: 时不应发生 conversation binding 键冲突', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    await store.conversationBindings.upsertByThread({
      channel: 'telegram',
      accountId: 'alpha',
      peerKey: 'beta::gamma',
      threadKey: 'delta',
      conversationId: 'conversation-1',
      updatedAt: '2026-03-10T00:00:00.000Z',
    });
    await store.conversationBindings.upsertByThread({
      channel: 'telegram',
      accountId: 'alpha::beta',
      peerKey: 'gamma',
      threadKey: 'delta',
      conversationId: 'conversation-2',
      updatedAt: '2026-03-10T00:01:00.000Z',
    });

    expect(
      await store.conversationBindings.getByThread({
        channel: 'telegram',
        accountId: 'alpha',
        peerKey: 'beta::gamma',
        threadKey: 'delta',
      })
    ).toEqual({
      channel: 'telegram',
      accountId: 'alpha',
      peerKey: 'beta::gamma',
      threadKey: 'delta',
      conversationId: 'conversation-1',
      updatedAt: '2026-03-10T00:00:00.000Z',
    });
    expect(
      await store.conversationBindings.getByThread({
        channel: 'telegram',
        accountId: 'alpha::beta',
        peerKey: 'gamma',
        threadKey: 'delta',
      })
    ).toEqual({
      channel: 'telegram',
      accountId: 'alpha::beta',
      peerKey: 'gamma',
      threadKey: 'delta',
      conversationId: 'conversation-2',
      updatedAt: '2026-03-10T00:01:00.000Z',
    });
  });

  it('pairing request 应复用现有 pending 请求并更新字段', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    const created = await store.pairing.createPairingRequest({
      channel: 'telegram',
      accountId: 'default',
      senderId: 'sender-1',
      peerId: 'peer-1',
      code: '111111',
      meta: { source: 'dm' },
      createdAt: '2026-03-10T00:00:00.000Z',
      expiresAt: '2026-03-10T00:15:00.000Z',
    });

    const reused = await store.pairing.createPairingRequest({
      channel: 'telegram',
      accountId: 'default',
      senderId: 'sender-1',
      peerId: 'peer-2',
      code: '222222',
      meta: { source: 'refresh' },
      createdAt: '2026-03-10T00:05:00.000Z',
      expiresAt: '2026-03-10T00:20:00.000Z',
    });

    expect(reused.id).toBe(created.id);
    expect(reused).toMatchObject({
      peerId: 'peer-2',
      code: '222222',
      status: 'pending',
      meta: { source: 'refresh' },
      createdAt: '2026-03-10T00:00:00.000Z',
      lastSeenAt: '2026-03-10T00:05:00.000Z',
      expiresAt: '2026-03-10T00:20:00.000Z',
    });
  });

  it('pairing request 应在读取与列表前自动过期', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    const created = await store.pairing.createPairingRequest({
      channel: 'telegram',
      accountId: 'default',
      senderId: 'sender-1',
      peerId: 'peer-1',
      code: '111111',
      createdAt: '2026-03-10T00:00:00.000Z',
      expiresAt: '2026-03-10T00:10:00.000Z',
    });

    await store.pairing.createPairingRequest({
      channel: 'telegram',
      accountId: 'default',
      senderId: 'sender-2',
      peerId: 'peer-2',
      code: '222222',
      createdAt: '2026-03-10T00:11:00.000Z',
      expiresAt: '2026-03-10T00:21:00.000Z',
    });

    expect(store.getPairingRequestById(created.id)).toMatchObject({
      id: created.id,
      status: 'expired',
      lastSeenAt: '2026-03-10T00:11:00.000Z',
    });
  });

  it('approve sender 应幂等，listPairingRequests 应支持筛选与倒序', async () => {
    const { getTelegramPersistenceStore } = await import('./persistence-store.js');
    const store = getTelegramPersistenceStore();

    await store.pairing.createPairingRequest({
      channel: 'telegram',
      accountId: 'default',
      senderId: 'sender-1',
      peerId: 'peer-1',
      code: '111111',
      createdAt: '2099-03-10T00:00:00.000Z',
      expiresAt: '2099-03-10T00:30:00.000Z',
    });
    const second = await store.pairing.createPairingRequest({
      channel: 'telegram',
      accountId: 'secondary',
      senderId: 'sender-2',
      peerId: 'peer-2',
      code: '222222',
      createdAt: '2099-03-10T00:05:00.000Z',
      expiresAt: '2099-03-10T00:35:00.000Z',
    });

    await store.pairing.approveSender({
      channel: 'telegram',
      accountId: 'secondary',
      senderId: 'sender-2',
      approvedAt: '2099-03-10T00:06:00.000Z',
    });
    await store.pairing.approveSender({
      channel: 'telegram',
      accountId: 'secondary',
      senderId: 'sender-2',
      approvedAt: '2099-03-10T00:07:00.000Z',
    });

    expect(
      await store.pairing.hasApprovedSender({
        channel: 'telegram',
        accountId: 'secondary',
        senderId: 'sender-2',
      })
    ).toBe(true);

    await store.pairing.updatePairingRequestStatus({
      requestId: second.id,
      status: 'approved',
      updatedAt: '2099-03-10T00:08:00.000Z',
    });

    expect(
      await store.pairing.listPairingRequests({
        channel: 'telegram',
      })
    ).toMatchObject([
      { id: second.id, accountId: 'secondary', status: 'approved' },
      { accountId: 'default', status: 'pending' },
    ]);

    expect(
      await store.pairing.listPairingRequests({
        channel: 'telegram',
        accountId: 'secondary',
        status: 'approved',
      })
    ).toEqual([
      expect.objectContaining({
        id: second.id,
        accountId: 'secondary',
        status: 'approved',
      }),
    ]);

    const rawState = mockStoreState.value as {
      approvedSendersByKey: Record<string, { approvedAt: string }>;
    };
    expect(Object.keys(rawState.approvedSendersByKey)).toHaveLength(1);
    expect(
      rawState.approvedSendersByKey[encodeCompositeKey(['telegram', 'secondary', 'sender-2'])]
    ).toEqual({
      approvedAt: '2099-03-10T00:07:00.000Z',
    });
  });
});
