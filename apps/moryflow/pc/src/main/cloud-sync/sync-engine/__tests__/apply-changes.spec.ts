/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import type { FileIndexStore } from '@moryflow/api';
import { FILE_INDEX_STORE_PATH } from '../../const';
import { fileIndexManager, getEntry } from '../../file-index';
import { applyChangesToFileIndex } from '../executor';

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-'));
};

const writeStore = async (vaultPath: string, store: FileIndexStore): Promise<void> => {
  const storePath = path.join(vaultPath, FILE_INDEX_STORE_PATH);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
};

describe('applyChangesToFileIndex', () => {
  let vaultPath = '';

  beforeEach(async () => {
    vaultPath = await createVault();
  });

  afterEach(async () => {
    fileIndexManager.clearCache(vaultPath);
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('updates lastSyncedSize/lastSyncedMtime from localStates', async () => {
    const fileId = 'file-1';
    const relativePath = 'a.md';
    const vectorClock = { device: 1 };

    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: fileId,
          path: relativePath,
          createdAt: Date.now(),
          vectorClock: {},
          lastSyncedHash: 'old-hash',
          lastSyncedClock: {},
          lastSyncedSize: null,
          lastSyncedMtime: null,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);

    const pendingChanges = new Map([
      [
        fileId,
        {
          type: 'modified',
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

    await applyChangesToFileIndex(
      vaultPath,
      pendingChanges,
      {
        completed: [],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        errors: [],
      },
      new Set([fileId]),
      localStates
    );

    const entry = getEntry(vaultPath, fileId);
    expect(entry?.lastSyncedHash).toBe('new-hash');
    expect(entry?.lastSyncedSize).toBe(42);
    expect(entry?.lastSyncedMtime).toBe(123456);
    expect(entry?.vectorClock).toEqual(vectorClock);
  });
});
