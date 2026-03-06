/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import type { FileIndexStore } from '@moryflow/api';
import type { SyncActionReceiptDto } from '../../api/types';
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

  it('returns action receipt for upload', async () => {
    const fileId = 'file-1';
    const relativePath = 'note.md';

    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: fileId,
          path: relativePath,
          createdAt: Date.now(),
          vectorClock: { device: 2 },
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

    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: Parameters<typeof executeAction>[11] = [];
    const uploadedObjects: Parameters<typeof executeAction>[12] = [];

    await executeAction(
      {
        action: 'upload',
        actionId: 'action-1',
        receiptToken: 'receipt-1',
        fileId,
        path: relativePath,
        url: 'https://upload',
      },
      vaultPath,
      'journal-1',
      'device-1',
      new Map(),
      new Map(),
      receipts,
      completedFileIds,
      deleted,
      downloadedEntries,
      conflictEntries,
      stagedOperations,
      uploadedObjects
    );

    expect(receipts).toEqual([
      {
        actionId: 'action-1',
        receiptToken: 'receipt-1',
      },
    ]);
    expect(completedFileIds).toEqual([fileId]);
  });

  it('reports expectedHash when deleting with server-provided contentHash', async () => {
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: Parameters<typeof executeAction>[11] = [];
    const uploadedObjects: Parameters<typeof executeAction>[12] = [];

    await executeAction(
      {
        action: 'delete',
        actionId: 'action-2',
        receiptToken: 'receipt-2',
        fileId: 'file-2',
        path: 'removed.md',
        contentHash: 'hash-remote',
      },
      vaultPath,
      'journal-1',
      'device-1',
      new Map(),
      new Map(),
      receipts,
      completedFileIds,
      deleted,
      downloadedEntries,
      conflictEntries,
      stagedOperations,
      uploadedObjects
    );

    expect(deleted).toEqual([{ fileId: 'file-2', expectedHash: 'hash-remote' }]);
    expect(receipts).toEqual([
      {
        actionId: 'action-2',
        receiptToken: 'receipt-2',
      },
    ]);
    expect(completedFileIds).toEqual(['file-2']);
  });

  it('rejects download path escaping vault boundary', async () => {
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: Parameters<typeof executeAction>[11] = [];
    const uploadedObjects: Parameters<typeof executeAction>[12] = [];

    await expect(
      executeAction(
        {
          action: 'download',
          actionId: 'action-3',
          receiptToken: 'receipt-3',
          fileId: 'file-3',
          path: '../escape.md',
          url: 'https://download',
          contentHash: 'hash',
        },
        vaultPath,
        'journal-1',
        'device-1',
        new Map(),
        new Map(),
        receipts,
        completedFileIds,
        deleted,
        downloadedEntries,
        conflictEntries,
        stagedOperations,
        uploadedObjects
      )
    ).rejects.toThrow('outside vault');
  });
});
