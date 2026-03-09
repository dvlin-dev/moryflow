import { describe, expect, it } from 'vitest';
import { resolveMobileSyncStatusModel } from './status-presentation';

describe('resolveMobileSyncStatusModel', () => {
  it('prioritizes recovery action when sync needs attention', () => {
    expect(
      resolveMobileSyncStatusModel({
        hasBinding: true,
        isEnabled: true,
        isSyncing: false,
        status: 'needs_recovery',
        hasError: true,
        notice: null,
      })
    ).toMatchObject({
      tone: 'needs-attention',
      calloutKind: 'recovery',
      primaryAction: 'resume-recovery',
    });
  });

  it('returns retry for offline state', () => {
    expect(
      resolveMobileSyncStatusModel({
        hasBinding: true,
        isEnabled: true,
        isSyncing: false,
        status: 'offline',
        hasError: false,
        notice: null,
      })
    ).toMatchObject({
      tone: 'needs-attention',
      calloutKind: 'offline',
      primaryAction: 'retry',
    });
  });

  it('returns setup action when binding is missing even if status is offline', () => {
    expect(
      resolveMobileSyncStatusModel({
        hasBinding: false,
        isEnabled: true,
        isSyncing: false,
        status: 'offline',
        hasError: true,
        notice: null,
      })
    ).toMatchObject({
      tone: 'needs-attention',
      calloutKind: 'setup',
      primaryAction: 'open-settings',
    });
  });

  it('keeps synced tone while surfacing conflict copy action', () => {
    expect(
      resolveMobileSyncStatusModel({
        hasBinding: true,
        isEnabled: true,
        isSyncing: false,
        status: 'idle',
        hasError: false,
        notice: {
          kind: 'conflict_copy_created',
          createdAt: 1,
          items: [
            {
              fileId: 'file-1',
              path: 'note (conflict).md',
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
