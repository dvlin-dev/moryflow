import { describe, expect, it } from 'vitest';

import {
  assertDesktopMembershipSession,
  assertUsageDelta,
  buildCloudSyncValidationFileName,
  findSearchHitByToken,
  hasSyncProgressed,
  hasSyncSettled,
} from '../production-validation.helpers';

describe('cloud sync production validation helpers', () => {
  it('builds deterministic cloud sync validation file name', () => {
    expect(buildCloudSyncValidationFileName('20260310125900')).toBe(
      'codex-validation-cloud-sync-20260310125900.md'
    );
  });

  it('accepts desktop membership state with access token present', () => {
    expect(() =>
      assertDesktopMembershipSession({
        hasRefreshToken: true,
        accessTokenPresent: true,
        localUserInfoPresent: true,
        refreshReason: null,
      })
    ).not.toThrow();
  });

  it('rejects desktop membership state with refresh token but no access token', () => {
    expect(() =>
      assertDesktopMembershipSession({
        hasRefreshToken: true,
        accessTokenPresent: false,
        localUserInfoPresent: true,
        refreshReason: 'network',
      })
    ).toThrow(/desktop membership session could not establish an access token/);
  });

  it('rejects missing desktop membership session with clear guidance', () => {
    expect(() =>
      assertDesktopMembershipSession({
        hasRefreshToken: false,
        accessTokenPresent: false,
        localUserInfoPresent: false,
        refreshReason: null,
      })
    ).toThrow(/browser-only session is insufficient/);
  });

  it('accepts usage delta that meets the minimum', () => {
    expect(() =>
      assertUsageDelta(
        {
          storage: { used: 10, limit: 100, percentage: 10 },
          fileLimit: { maxFileSize: 1_000 },
          plan: 'starter',
        },
        {
          storage: { used: 110, limit: 1000, percentage: 11 },
          fileLimit: { maxFileSize: 1_000 },
          plan: 'starter',
        },
        100
      )
    ).not.toThrow();
  });

  it('rejects usage delta smaller than the minimum', () => {
    expect(() =>
      assertUsageDelta(
        {
          storage: { used: 10, limit: 100, percentage: 10 },
          fileLimit: { maxFileSize: 1_000 },
          plan: 'starter',
        },
        {
          storage: { used: 50, limit: 1000, percentage: 5 },
          fileLimit: { maxFileSize: 1_000 },
          plan: 'starter',
        },
        100
      )
    ).toThrow(/usage delta 40 is smaller than required minimum 100/);
  });

  it('treats advanced lastSyncAt as progress', () => {
    expect(
      hasSyncProgressed(
        {
          engineStatus: 'idle',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 100,
        },
        {
          engineStatus: 'idle',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 200,
        }
      )
    ).toBe(true);
  });

  it('treats advanced lastSyncAt plus non-syncing status as settled', () => {
    expect(
      hasSyncSettled(
        {
          engineStatus: 'syncing',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 100,
        },
        {
          engineStatus: 'idle',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 200,
        }
      )
    ).toBe(true);
  });

  it('rejects statuses that are truthy but still lack real sync progress', () => {
    expect(
      hasSyncSettled(
        {
          engineStatus: 'idle',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 100,
        },
        {
          engineStatus: 'idle',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 100,
        }
      )
    ).toBe(false);
  });

  it('rejects statuses that are still syncing even after lastSyncAt advances', () => {
    expect(
      hasSyncSettled(
        {
          engineStatus: 'idle',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 100,
        },
        {
          engineStatus: 'syncing',
          pendingFiles: [],
          recentActivities: [],
          lastSyncAt: 200,
        }
      )
    ).toBe(false);
  });

  it('finds cloud sync search hit by token', () => {
    expect(
      findSearchHitByToken(
        [
          {
            fileId: 'file-1',
            vaultId: 'vault-1',
            path: '/codex-validation-cloud-sync-20260310125900.md',
            snippet: 'hello token',
            score: 0.9,
            title: 'codex-validation-cloud-sync-20260310125900.md',
          },
        ],
        '20260310125900'
      )
    ).toEqual(
      expect.objectContaining({
        fileId: 'file-1',
      })
    );
  });

  it('throws when token is absent from all search fields', () => {
    expect(() => findSearchHitByToken([], 'missing-token')).toThrow(
      'search miss for token missing-token'
    );
  });
});
