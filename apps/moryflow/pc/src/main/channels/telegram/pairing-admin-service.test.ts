/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqliteStoreMock = vi.hoisted(() => ({
  getTelegramPersistenceStore: vi.fn(),
}));

vi.mock('./sqlite-store.js', () => ({
  getTelegramPersistenceStore: sqliteStoreMock.getTelegramPersistenceStore,
}));

import { createTelegramPairingAdminService } from './pairing-admin-service.js';

const createPersistence = () => ({
  pairing: {
    listPairingRequests: vi.fn(),
    approveSender: vi.fn(),
    updatePairingRequestStatus: vi.fn(),
  },
  getPairingRequestById: vi.fn(),
});

describe('createTelegramPairingAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPairingRequests 透传筛选并规范化返回', async () => {
    const persistence = createPersistence();
    persistence.pairing.listPairingRequests.mockResolvedValue([
      {
        id: 'req_1',
        accountId: 'default',
        senderId: 'sender_1',
        peerId: 'peer_1',
        code: '123456',
        status: 'pending',
        createdAt: '2026-03-03T12:00:00.000Z',
        expiresAt: '2026-03-03T12:15:00.000Z',
        lastSeenAt: '2026-03-03T12:01:00.000Z',
      },
    ]);
    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue(persistence);

    const service = createTelegramPairingAdminService();
    const result = await service.listPairingRequests({
      accountId: 'default',
      status: 'pending',
    });

    expect(persistence.pairing.listPairingRequests).toHaveBeenCalledWith({
      channel: 'telegram',
      accountId: 'default',
      status: 'pending',
    });
    expect(result).toEqual([
      {
        id: 'req_1',
        accountId: 'default',
        senderId: 'sender_1',
        peerId: 'peer_1',
        code: '123456',
        status: 'pending',
        createdAt: '2026-03-03T12:00:00.000Z',
        expiresAt: '2026-03-03T12:15:00.000Z',
        lastSeenAt: '2026-03-03T12:01:00.000Z',
        meta: undefined,
      },
    ]);
  });

  it('approvePairingRequest 在请求不存在时抛错', async () => {
    const persistence = createPersistence();
    persistence.getPairingRequestById.mockReturnValue(null);
    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue(persistence);

    const service = createTelegramPairingAdminService();

    await expect(service.approvePairingRequest('missing')).rejects.toThrow(
      'Pairing request not found'
    );
  });

  it('approvePairingRequest 在请求非 pending 时拒绝审批', async () => {
    const persistence = createPersistence();
    persistence.getPairingRequestById.mockReturnValue({
      id: 'req_expired',
      accountId: 'default',
      senderId: 'sender_2',
      status: 'expired',
    });
    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue(persistence);

    const service = createTelegramPairingAdminService();
    await expect(service.approvePairingRequest('req_expired')).rejects.toThrow(
      'Pairing request is not pending'
    );
    expect(persistence.pairing.approveSender).not.toHaveBeenCalled();
    expect(persistence.pairing.updatePairingRequestStatus).not.toHaveBeenCalled();
  });

  it('approvePairingRequest 同步写入 approved sender 与请求状态', async () => {
    const persistence = createPersistence();
    persistence.getPairingRequestById.mockReturnValue({
      id: 'req_2',
      accountId: 'default',
      senderId: 'sender_2',
      status: 'pending',
    });
    persistence.pairing.approveSender.mockResolvedValue(undefined);
    persistence.pairing.updatePairingRequestStatus.mockResolvedValue(undefined);
    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue(persistence);

    const service = createTelegramPairingAdminService();
    await service.approvePairingRequest('req_2');

    const approveArg = persistence.pairing.approveSender.mock.calls[0][0];
    const updateArg = persistence.pairing.updatePairingRequestStatus.mock.calls[0][0];

    expect(approveArg).toMatchObject({
      channel: 'telegram',
      accountId: 'default',
      senderId: 'sender_2',
    });
    expect(updateArg.requestId).toBe('req_2');
    expect(updateArg.status).toBe('approved');
    expect(updateArg.updatedAt).toBe(approveArg.approvedAt);
  });

  it('denyPairingRequest 更新 denied 状态', async () => {
    const persistence = createPersistence();
    persistence.getPairingRequestById.mockReturnValue({
      id: 'req_3',
      accountId: 'default',
      senderId: 'sender_3',
      status: 'pending',
    });
    persistence.pairing.updatePairingRequestStatus.mockResolvedValue(undefined);
    sqliteStoreMock.getTelegramPersistenceStore.mockReturnValue(persistence);

    const service = createTelegramPairingAdminService();
    await service.denyPairingRequest('req_3');

    expect(persistence.pairing.updatePairingRequestStatus).toHaveBeenCalledWith({
      requestId: 'req_3',
      status: 'denied',
      updatedAt: expect.any(String),
    });
  });
});
