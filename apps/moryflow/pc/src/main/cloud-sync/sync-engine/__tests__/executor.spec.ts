/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import type { FileIndexStore } from '@moryflow/api';
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
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
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

  it('reports expectedHash when deleting with server-provided contentHash', async () => {
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const completed: CompletedFileDto[] = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await executeAction(
      { action: 'delete', fileId: 'file-2', path: 'removed.md', contentHash: 'hash-remote' },
      vaultPath,
      'device-1',
      new Map(),
      new Map(),
      completed,
      deleted,
      downloadedEntries,
      conflictEntries
    );

    expect(deleted).toEqual([{ fileId: 'file-2', expectedHash: 'hash-remote' }]);
  });

  it('rejects download path escaping vault boundary', async () => {
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const completed: CompletedFileDto[] = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await expect(
      executeAction(
        {
          action: 'download',
          fileId: 'file-3',
          path: '../escape.md',
          url: 'https://download',
          contentHash: 'hash',
        },
        vaultPath,
        'device-1',
        new Map(),
        new Map(),
        completed,
        deleted,
        downloadedEntries,
        conflictEntries
      )
    ).rejects.toThrow('outside vault');
  });
});
