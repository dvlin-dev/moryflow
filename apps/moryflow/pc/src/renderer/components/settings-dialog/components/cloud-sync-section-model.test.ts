import { describe, expect, it } from 'vitest';

import {
  resolveCloudSyncSectionState,
  resolveCloudSyncStatusTone,
} from './cloud-sync-section-model';

describe('cloud-sync-section-model', () => {
  describe('resolveCloudSyncSectionState', () => {
    it('returns auth-loading first', () => {
      expect(
        resolveCloudSyncSectionState({
          authLoading: true,
          isAuthenticated: false,
          vaultPath: null,
        })
      ).toBe('auth-loading');
    });

    it('returns unauthenticated when user is not logged in', () => {
      expect(
        resolveCloudSyncSectionState({
          authLoading: false,
          isAuthenticated: false,
          vaultPath: '/tmp/vault',
        })
      ).toBe('unauthenticated');
    });

    it('returns missing-vault when user is logged in without vault', () => {
      expect(
        resolveCloudSyncSectionState({
          authLoading: false,
          isAuthenticated: true,
          vaultPath: '',
        })
      ).toBe('missing-vault');
    });

    it('returns ready when auth and vault are both available', () => {
      expect(
        resolveCloudSyncSectionState({
          authLoading: false,
          isAuthenticated: true,
          vaultPath: '/tmp/vault',
        })
      ).toBe('ready');
    });
  });

  describe('resolveCloudSyncStatusTone', () => {
    it('prioritizes syncing tone', () => {
      expect(
        resolveCloudSyncStatusTone({
          isSyncing: true,
          hasBinding: false,
          engineStatus: 'disabled',
          hasError: true,
        })
      ).toBe('syncing');
    });

    it('returns needs-attention for missing binding/offline/disabled/error', () => {
      expect(
        resolveCloudSyncStatusTone({
          isSyncing: false,
          hasBinding: false,
          engineStatus: 'idle',
          hasError: false,
        })
      ).toBe('needs-attention');

      expect(
        resolveCloudSyncStatusTone({
          isSyncing: false,
          hasBinding: true,
          engineStatus: 'offline',
          hasError: false,
        })
      ).toBe('needs-attention');

      expect(
        resolveCloudSyncStatusTone({
          isSyncing: false,
          hasBinding: true,
          engineStatus: 'idle',
          hasError: true,
        })
      ).toBe('needs-attention');
    });

    it('returns synced for stable bound idle engine', () => {
      expect(
        resolveCloudSyncStatusTone({
          isSyncing: false,
          hasBinding: true,
          engineStatus: 'idle',
          hasError: false,
        })
      ).toBe('synced');
    });
  });
});
