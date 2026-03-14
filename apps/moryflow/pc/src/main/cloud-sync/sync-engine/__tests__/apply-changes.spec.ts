/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import {
  ensureSyncMirrorEntry,
  getSyncMirrorEntry,
  resetSyncMirror,
} from '../../sync-mirror-state.js';
import { applyChangesToSyncMirror } from '../executor';

describe('applyChangesToSyncMirror', () => {
  let vaultPath = '';
  const profileKey = 'profile-1';

  beforeEach(async () => {
    vaultPath = await mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-'));
  });

  afterEach(async () => {
    await resetSyncMirror(vaultPath, profileKey);
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('updates lastSynced metadata for completed local changes', async () => {
    const fileId = 'file-1';
    const relativePath = 'a.md';
    const vectorClock = { device: 1 };

    await ensureSyncMirrorEntry(vaultPath, profileKey, fileId, relativePath);

    const pendingChanges = new Map([
      [
        fileId,
        {
          type: 'modified' as const,
          fileId,
          path: relativePath,
          vectorClock,
          contentHash: 'new-hash',
          expectedHash: 'old-hash',
        },
      ],
    ]);

    const localStates = new Map([
      [
        fileId,
        {
          fileId,
          path: relativePath,
          contentHash: 'new-hash',
          size: 42,
          mtime: 123456,
        },
      ],
    ]);

    await applyChangesToSyncMirror(
      vaultPath,
      profileKey,
      pendingChanges,
      {
        receipts: [],
        completedFileIds: [],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      new Set([fileId]),
      localStates,
    );

    const entry = getSyncMirrorEntry(vaultPath, profileKey, fileId);
    expect(entry?.lastSyncedHash).toBe('new-hash');
    expect(entry?.lastSyncedSize).toBe(42);
    expect(entry?.lastSyncedMtime).toBe(123456);
    expect(entry?.vectorClock).toEqual(vectorClock);
  });
});
