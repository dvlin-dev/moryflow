/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import type { FileIndexStore } from '@moryflow/api';
import { FILE_INDEX_STORE_PATH } from '../../const';
import { fileIndexManager } from '../index';

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-file-index-'));
};

const writeStore = async (vaultPath: string, store: FileIndexStore): Promise<void> => {
  const storePath = path.join(vaultPath, FILE_INDEX_STORE_PATH);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
};

describe('fileIndexManager.scanAndCreateIds', () => {
  let vaultPath = '';

  beforeEach(async () => {
    vaultPath = await createVault();
  });

  afterEach(async () => {
    fileIndexManager.clearCache(vaultPath);
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('keeps missing entries that were synced before (for tombstone reporting)', async () => {
    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: 'file-synced',
          path: 'missing.md',
          createdAt: Date.now(),
          vectorClock: { device: 1 },
          lastSyncedHash: 'hash-old',
          lastSyncedClock: { device: 1 },
          lastSyncedSize: 1,
          lastSyncedMtime: 1,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);
    await fileIndexManager.scanAndCreateIds(vaultPath);

    const entries = fileIndexManager.getAll(vaultPath);
    expect(entries.map((entry) => entry.path)).toContain('missing.md');
  });

  it('still removes missing entries that were never synced', async () => {
    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: 'file-unsynced',
          path: 'draft.md',
          createdAt: Date.now(),
          vectorClock: {},
          lastSyncedHash: null,
          lastSyncedClock: {},
          lastSyncedSize: null,
          lastSyncedMtime: null,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);
    await fileIndexManager.scanAndCreateIds(vaultPath);

    const entries = fileIndexManager.getAll(vaultPath);
    expect(entries).toHaveLength(0);
  });

  it('tracks .markdown files during scan', async () => {
    const markdownPath = path.join(vaultPath, 'note.markdown');
    await writeFile(markdownPath, '# note');

    await fileIndexManager.load(vaultPath);
    const created = await fileIndexManager.scanAndCreateIds(vaultPath);

    expect(created).toBe(1);
    expect(fileIndexManager.getByPath(vaultPath, 'note.markdown')).not.toBeNull();
  });

  it('keeps synced entry when delete is triggered (for tombstone reporting)', async () => {
    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: 'file-synced-delete',
          path: 'removed.md',
          createdAt: Date.now(),
          vectorClock: { device: 1 },
          lastSyncedHash: 'hash-old',
          lastSyncedClock: { device: 1 },
          lastSyncedSize: 12,
          lastSyncedMtime: 12,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);
    const removedId = await fileIndexManager.delete(vaultPath, 'removed.md');

    expect(removedId).toBe('file-synced-delete');
    expect(fileIndexManager.getByPath(vaultPath, 'removed.md')).not.toBeNull();
  });
});
