/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTelegramConversationService } from './conversation-service.js';

const createThread = () => ({
  peerKey: 'telegram:default:peer:123',
  threadKey: 'telegram:default:peer:123:thread:root',
});

describe('createTelegramConversationService', () => {
  const getByThread = vi.fn();
  const upsertByThread = vi.fn();
  const createSession = vi.fn();
  const deleteSession = vi.fn();
  const getSessionSummary = vi.fn();
  const resolveVaultPath = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getByThread.mockResolvedValue(null);
    upsertByThread.mockResolvedValue(undefined);
    createSession.mockReturnValue({ id: 'chat_new_1' });
    deleteSession.mockReset();
    getSessionSummary.mockReturnValue({ id: 'chat_new_1' });
    resolveVaultPath.mockResolvedValue('/vault/main');
  });

  it('无绑定时 ensureConversationId 应创建会话并写入绑定', async () => {
    const service = createTelegramConversationService({
      accountId: 'default',
      bindings: {
        getByThread,
        upsertByThread,
      },
      sessions: {
        createSession,
        deleteSession,
        getSessionSummary,
      },
      resolveVaultPath,
    });

    const conversationId = await service.ensureConversationId(createThread());
    expect(conversationId).toBe('chat_new_1');
    expect(createSession).toHaveBeenCalledWith({
      vaultPath: '/vault/main',
    });
    expect(upsertByThread).toHaveBeenCalledTimes(1);
  });

  it('已有绑定且会话有效时 ensureConversationId 应直接复用', async () => {
    getByThread.mockResolvedValue({ conversationId: 'chat_existing_1' });
    getSessionSummary.mockReturnValue({ id: 'chat_existing_1' });

    const service = createTelegramConversationService({
      accountId: 'default',
      bindings: {
        getByThread,
        upsertByThread,
      },
      sessions: {
        createSession,
        deleteSession,
        getSessionSummary,
      },
      resolveVaultPath,
    });

    const conversationId = await service.ensureConversationId(createThread());
    expect(conversationId).toBe('chat_existing_1');
    expect(createSession).not.toHaveBeenCalled();
    expect(upsertByThread).not.toHaveBeenCalled();
  });

  it('绑定指向失效会话时 ensureConversationId 应自愈重建', async () => {
    getByThread.mockResolvedValue({ conversationId: 'chat_missing' });
    getSessionSummary.mockImplementation(() => {
      throw new Error('session not found');
    });

    const service = createTelegramConversationService({
      accountId: 'default',
      bindings: {
        getByThread,
        upsertByThread,
      },
      sessions: {
        createSession,
        deleteSession,
        getSessionSummary,
      },
      resolveVaultPath,
    });

    const conversationId = await service.ensureConversationId(createThread());
    expect(conversationId).toBe('chat_new_1');
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(upsertByThread).toHaveBeenCalledTimes(1);
  });

  it('createNewConversationId 应始终创建新会话并覆盖绑定', async () => {
    createSession
      .mockReturnValueOnce({ id: 'chat_new_1' })
      .mockReturnValueOnce({ id: 'chat_new_2' });

    const service = createTelegramConversationService({
      accountId: 'default',
      bindings: {
        getByThread,
        upsertByThread,
      },
      sessions: {
        createSession,
        deleteSession,
        getSessionSummary,
      },
      resolveVaultPath,
    });

    await service.ensureConversationId(createThread());
    const newConversationId = await service.createNewConversationId(createThread());

    expect(newConversationId).toBe('chat_new_2');
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(upsertByThread).toHaveBeenCalledTimes(2);
  });

  it('绑定写入失败时应回滚删除新建会话，避免 orphan conversation', async () => {
    upsertByThread.mockRejectedValueOnce(new Error('db write failed'));

    const service = createTelegramConversationService({
      accountId: 'default',
      bindings: {
        getByThread,
        upsertByThread,
      },
      sessions: {
        createSession,
        deleteSession,
        getSessionSummary,
      },
      resolveVaultPath,
    });

    await expect(service.createNewConversationId(createThread())).rejects.toThrow(
      'db write failed'
    );
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(deleteSession).toHaveBeenCalledWith('chat_new_1');
  });
});
