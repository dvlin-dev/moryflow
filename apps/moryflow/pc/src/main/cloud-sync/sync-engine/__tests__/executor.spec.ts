/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import type { SyncActionReceiptDto } from '../../api/types';
import {
  executeAction,
  computeBufferHash,
  type DownloadedEntry,
  type ConflictEntry,
  type StagedApplyOperation,
  type UploadedObjectRef,
} from '../executor';

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-'));
};

describe('executeAction', () => {
  let vaultPath = '';

  beforeEach(async () => {
    vaultPath = await createVault();
  });

  afterEach(async () => {
    await rm(vaultPath, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('returns action receipt for upload', async () => {
    const fileId = 'file-1';
    const relativePath = 'note.md';

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
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

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
      'profile-1',
      'workspace-1',
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
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

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
      'profile-1',
      'workspace-1',
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

  it('stages download writes and records remote metadata', async () => {
    const downloadedAt = 123;
    vi.spyOn(Date, 'now').mockReturnValue(downloadedAt);

    const remoteContent = Buffer.from('remote');
    const remoteHash = computeBufferHash(remoteContent);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => remoteContent,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

    await executeAction(
      {
        action: 'download',
        actionId: 'action-download-1',
        receiptToken: 'receipt-download-1',
        fileId: 'file-download-1',
        path: 'remote.md',
        url: 'https://download',
        contentHash: remoteHash,
        size: remoteContent.length,
        remoteVectorClock: { remote: 1 },
      },
      vaultPath,
      'profile-1',
      'workspace-1',
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
        actionId: 'action-download-1',
        receiptToken: 'receipt-download-1',
      },
    ]);
    expect(completedFileIds).toEqual(['file-download-1']);
    expect(downloadedEntries).toEqual([
      {
        fileId: 'file-download-1',
        path: 'remote.md',
        vectorClock: { remote: 1 },
        contentHash: remoteHash,
        size: remoteContent.length,
        mtime: downloadedAt,
        storageRevision: null,
      },
    ]);
    expect(stagedOperations).toEqual([
      expect.objectContaining({
        type: 'write_file',
        fileId: 'file-download-1',
        targetPath: 'remote.md',
      }),
    ]);
  });

  it('downloads and uploads conflict copies before staging the preserved file', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);

    const localContent = Buffer.from('local');
    const remoteContent = Buffer.from('remote');
    const localHash = computeBufferHash(localContent);
    const remoteHash = computeBufferHash(remoteContent);
    const absolutePath = path.join(vaultPath, 'note.md');

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, localContent);

    const fetchMock = vi.fn(async (input: string) => {
      if (input === 'https://download') {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          arrayBuffer: async () => remoteContent,
        };
      }

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const pendingChanges = new Map([
      [
        'file-1',
        {
          type: 'modified' as const,
          fileId: 'file-1',
          path: 'note.md',
          vectorClock: { 'device-1': 2 },
          contentHash: localHash,
        },
      ],
    ]);

    const localStates = new Map([
      [
        'file-1',
        {
          fileId: 'file-1',
          path: 'note.md',
          contentHash: localHash,
          size: localContent.length,
          mtime: 456,
        },
      ],
    ]);

    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

    await executeAction(
      {
        action: 'conflict',
        actionId: 'action-conflict-1',
        receiptToken: 'receipt-conflict-1',
        fileId: 'file-1',
        path: 'note.md',
        url: 'https://download',
        uploadUrl: 'https://upload-local',
        conflictRename: 'note (conflict).md',
        conflictCopyId: 'conflict-id',
        conflictCopyUploadUrl: 'https://upload-conflict',
        storageRevision: '550e8400-e29b-41d4-a716-446655440010',
        conflictCopyStorageRevision: '550e8400-e29b-41d4-a716-446655440011',
        remoteVectorClock: { remote: 1 },
        contentHash: remoteHash,
        size: remoteContent.length,
        uploadContentHash: localHash,
        uploadSize: localContent.length,
      },
      vaultPath,
      'profile-1',
      'workspace-1',
      'journal-1',
      'device-1',
      pendingChanges,
      localStates,
      receipts,
      completedFileIds,
      deleted,
      downloadedEntries,
      conflictEntries,
      stagedOperations,
      uploadedObjects
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://download');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://upload-conflict');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://upload-local');

    expect(receipts).toEqual([
      {
        actionId: 'action-conflict-1',
        receiptToken: 'receipt-conflict-1',
      },
    ]);
    expect(completedFileIds).toEqual(['file-1', 'conflict-id']);
    expect(conflictEntries).toEqual([
      {
        originalFileId: 'file-1',
        originalPath: 'note.md',
        mergedClock: { 'device-1': 3, remote: 1 },
        contentHash: localHash,
        originalSize: localContent.length,
        originalMtime: 456,
        originalStorageRevision: '550e8400-e29b-41d4-a716-446655440010',
        conflictCopyId: 'conflict-id',
        conflictCopyPath: 'note (conflict).md',
        conflictCopyClock: { remote: 1 },
        conflictCopyHash: remoteHash,
        conflictCopySize: remoteContent.length,
        conflictCopyMtime: 123,
        conflictCopyStorageRevision: '550e8400-e29b-41d4-a716-446655440011',
      },
    ]);
    expect(stagedOperations).toEqual([
      expect.objectContaining({
        type: 'write_file',
        fileId: 'conflict-id',
        targetPath: 'note (conflict).md',
      }),
    ]);
    expect(uploadedObjects).toEqual([
      {
        fileId: 'conflict-id',
        storageRevision: '550e8400-e29b-41d4-a716-446655440011',
        contentHash: remoteHash,
      },
      {
        fileId: 'file-1',
        storageRevision: '550e8400-e29b-41d4-a716-446655440010',
        contentHash: localHash,
      },
    ]);
  });

  it('rejects download path escaping vault boundary', async () => {
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

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
        'profile-1',
        'workspace-1',
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
