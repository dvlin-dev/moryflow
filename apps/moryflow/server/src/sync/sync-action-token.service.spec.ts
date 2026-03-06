import { HttpException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  ExpiredSyncActionReceiptException,
  InvalidSyncActionReceiptException,
  SyncActionTokenService,
  type SyncActionTokenUnsignedClaims,
} from './sync-action-token.service';

const createService = (overrides?: Record<string, string | undefined>) =>
  new SyncActionTokenService({
    get: (key: string, fallback?: string) => {
      if (overrides && key in overrides) {
        return overrides[key];
      }
      if (key === 'SYNC_ACTION_SECRET') return 'test-sync-secret';
      if (key === 'SYNC_ACTION_RECEIPT_TTL_SECONDS') return '60';
      return fallback;
    },
  } as ConfigService);

const uploadClaims = (): SyncActionTokenUnsignedClaims => ({
  userId: 'user-1',
  vaultId: '550e8400-e29b-41d4-a716-446655440000',
  deviceId: '550e8400-e29b-41d4-a716-446655440001',
  actionId: '550e8400-e29b-41d4-a716-446655440002',
  action: 'upload',
  file: {
    fileId: '550e8400-e29b-41d4-a716-446655440003',
    path: 'notes/a.md',
    title: 'a',
    size: 12,
    contentHash: 'hash-local',
    storageRevision: '550e8400-e29b-41d4-a716-446655440004',
    vectorClock: { device: 2 },
    expectedHash: 'hash-old',
    expectedStorageRevision: '550e8400-e29b-41d4-a716-446655440005',
  },
});

describe('SyncActionTokenService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('issues and verifies receipt token bound to sync context', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T00:00:00.000Z'));

    const service = createService();
    const claims = uploadClaims();
    const token = service.issueReceiptToken(claims);

    const verified = service.verifyReceiptToken(token, {
      userId: claims.userId,
      vaultId: claims.vaultId,
      deviceId: claims.deviceId,
      actionId: claims.actionId,
    });

    expect(verified).toMatchObject(claims);
    expect(verified.issuedAt).toBe(Date.parse('2026-03-06T00:00:00.000Z'));
    expect(verified.expiresAt).toBe(Date.parse('2026-03-06T00:01:00.000Z'));
  });

  it('rejects token replay for another device', () => {
    const service = createService();
    const claims = uploadClaims();
    const token = service.issueReceiptToken(claims);

    try {
      service.verifyReceiptToken(token, {
        userId: claims.userId,
        vaultId: claims.vaultId,
        deviceId: '550e8400-e29b-41d4-a716-446655440099',
        actionId: claims.actionId,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSyncActionReceiptException);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
    }
  });

  it('rejects expired receipt token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T00:00:00.000Z'));

    const service = createService();
    const claims = uploadClaims();
    const token = service.issueReceiptToken(claims);

    vi.advanceTimersByTime(61_000);

    try {
      service.verifyReceiptToken(token, {
        userId: claims.userId,
        vaultId: claims.vaultId,
        deviceId: claims.deviceId,
        actionId: claims.actionId,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ExpiredSyncActionReceiptException);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(409);
    }
  });

  it('fails fast when SYNC_ACTION_SECRET is missing', () => {
    expect(() => createService({ SYNC_ACTION_SECRET: undefined })).toThrow(
      'SYNC_ACTION_SECRET is required',
    );
  });
});
