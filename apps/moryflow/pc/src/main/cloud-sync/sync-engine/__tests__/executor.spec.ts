/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import type { FileIndexStore } from '@anyhunt/api';
import type { CompletedFileDto } from '../../api/types';
import { FILE_INDEX_STORE_PATH } from '../../const';
import { fileIndexManager } from '../../file-index';
import { executeAction, type DownloadedEntry, type ConflictEntry } from '../executor';

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-'));
};

const writeStore = async (vaultPath: string, store: FileIndexStore): Promise<void> => {
  const storePath = path.join(vaultPath, FILE_INDEX_STORE_PATH);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
};

describe('executeAction', () => {
  let vaultPath = '';

  beforeEach(async () => {
    vaultPath = await createVault();
  });

  afterEach(async () => {
    fileIndexManager.clearCache(vaultPath);
    await rm(vaultPath, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('falls back to entry clock when pendingChanges is missing', async () => {
    const fileId = 'file-1';
    const relativePath = 'note.md';
    const vectorClock = { device: 2 };

    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: fileId,
          path: relativePath,
          createdAt: Date.now(),
          vectorClock,
          lastSyncedHash: 'hash-1',
          lastSyncedClock: {},
          lastSyncedSize: null,
          lastSyncedMtime: null,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);

    const absolutePath = path.join(vaultPath, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, 'hello');

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const completed: CompletedFileDto[] = [];
    const deleted: string[] = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await executeAction(
      { action: 'upload', fileId, path: relativePath, url: 'https://upload' },
      vaultPath,
      'device-1',
      new Map(),
      new Map(),
      completed,
      deleted,
      downloadedEntries,
      conflictEntries
    );

    expect(completed).toHaveLength(1);
    expect(completed[0].vectorClock).toEqual(vectorClock);
  });
});
