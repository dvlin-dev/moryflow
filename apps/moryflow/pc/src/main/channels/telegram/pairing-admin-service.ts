/**
 * [INPUT]: pairing request 查询与审批参数
 * [OUTPUT]: pairing requests / approve / deny 结果
 * [POS]: Telegram pairing 管理服务（审批域边界）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { PairingRequestStatus } from '@moryflow/channels-core';
import { getTelegramPersistenceStore } from './sqlite-store.js';
import type { TelegramPairingRequestItem } from './types.js';

const normalizePairing = (item: {
  id: string;
  accountId: string;
  senderId: string;
  peerId: string;
  code: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  meta?: Record<string, unknown>;
}): TelegramPairingRequestItem => ({
  id: item.id,
  accountId: item.accountId,
  senderId: item.senderId,
  peerId: item.peerId,
  code: item.code,
  status: item.status,
  createdAt: item.createdAt,
  expiresAt: item.expiresAt,
  lastSeenAt: item.lastSeenAt,
  meta: item.meta,
});

const ensurePendingPairingRequest = (request: {
  status?: 'pending' | 'approved' | 'denied' | 'expired';
}) => {
  if (request.status !== 'pending') {
    throw new Error('Pairing request is not pending');
  }
};

export type TelegramPairingAdminService = {
  listPairingRequests: (input?: {
    accountId?: string;
    status?: PairingRequestStatus;
  }) => Promise<TelegramPairingRequestItem[]>;
  approvePairingRequest: (requestId: string) => Promise<void>;
  denyPairingRequest: (requestId: string) => Promise<void>;
};

export const createTelegramPairingAdminService = (): TelegramPairingAdminService => {
  return {
    listPairingRequests: async (input) => {
      const persistence = getTelegramPersistenceStore();
      const requests = await persistence.pairing.listPairingRequests({
        channel: 'telegram',
        accountId: input?.accountId,
        status: input?.status,
      });
      return requests.map(normalizePairing);
    },
    approvePairingRequest: async (requestId: string) => {
      const persistence = getTelegramPersistenceStore();
      const request = persistence.getPairingRequestById(requestId);
      if (!request) {
        throw new Error('Pairing request not found');
      }
      ensurePendingPairingRequest(request);

      const approvedAt = new Date().toISOString();
      await persistence.pairing.approveSender({
        channel: 'telegram',
        accountId: request.accountId,
        senderId: request.senderId,
        approvedAt,
      });
      await persistence.pairing.updatePairingRequestStatus({
        requestId,
        status: 'approved',
        updatedAt: approvedAt,
      });
    },
    denyPairingRequest: async (requestId: string) => {
      const persistence = getTelegramPersistenceStore();
      const request = persistence.getPairingRequestById(requestId);
      if (!request) {
        throw new Error('Pairing request not found');
      }
      ensurePendingPairingRequest(request);
      await persistence.pairing.updatePairingRequestStatus({
        requestId,
        status: 'denied',
        updatedAt: new Date().toISOString(),
      });
    },
  };
};
