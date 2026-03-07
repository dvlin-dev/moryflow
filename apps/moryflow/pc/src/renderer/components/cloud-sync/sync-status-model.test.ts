import { describe, expect, it } from 'vitest';
import { resolveSyncStatusModel } from './sync-status-model';

describe('resolveSyncStatusModel', () => {
  it('returns recovery action for needs_recovery', () => {
    expect(
      resolveSyncStatusModel({
        hasBinding: true,
        isSyncing: false,
        engineStatus: 'needs_recovery',
        hasError: true,
        notice: null,
      })
    ).toMatchObject({
      tone: 'needs-attention',
      calloutKind: 'recovery',
      primaryAction: 'resume-recovery',
    });
  });

  it('returns retry action for offline failures', () => {
    expect(
      resolveSyncStatusModel({
        hasBinding: true,
        isSyncing: false,
        engineStatus: 'offline',
        hasError: false,
        notice: null,
      })
    ).toMatchObject({
      tone: 'needs-attention',
      calloutKind: 'offline',
      primaryAction: 'retry',
    });
  });

  it('returns setup action when binding is missing', () => {
    expect(
      resolveSyncStatusModel({
        hasBinding: false,
        isSyncing: false,
        engineStatus: 'idle',
        hasError: false,
        notice: null,
      })
    ).toMatchObject({
      tone: 'needs-attention',
      calloutKind: 'setup',
      primaryAction: 'open-settings',
    });
  });

  it('surfaces conflict copy notice without turning synced state into error', () => {
    expect(
      resolveSyncStatusModel({
        hasBinding: true,
        isSyncing: false,
        engineStatus: 'idle',
        hasError: false,
        notice: {
          kind: 'conflict_copy_created',
          createdAt: 1,
          items: [
            {
              fileId: 'file-1',
              path: 'notes/a (conflict).md',
            },
          ],
        },
      })
    ).toMatchObject({
      tone: 'synced',
      calloutKind: 'conflict',
      primaryAction: 'open-conflict-copy',
    });
  });
});
