/**
 * [INPUT]: executor actions
 * [OUTPUT]: execution results and FileIndex writebacks
 * [POS]: Mobile Cloud Sync executor tests
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { FileEntry } from '@moryflow/api';
import type { SyncActionReceiptDto } from '@moryflow/api/cloud-sync';
import { createEmptyClock } from '@moryflow/sync';
import type { PendingChange, LocalFileState } from '../file-collector';

const fileSystem = vi.hoisted(() => {
  const nodePath = require('node:path') as typeof import('node:path');
  const files = new Map<string, { content: string; mtime: number }>();
  const directories = new Set<string>();

  const setFile = (filePath: string, content: string, mtime: number): void => {
    files.set(filePath, { content, mtime });
  };

  class File {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    get exists(): boolean {
      return files.has(this.uri);
    }

    get size(): number {
      if (!this.exists) return 0;
      const data = files.get(this.uri);
      return data ? Buffer.byteLength(data.content) : 0;
    }

    get modificationTime(): number | null {
      if (!this.exists) return null;
      return files.get(this.uri)?.mtime ?? null;
    }

    textSync(): string {
      if (!this.exists) {
        throw new Error('File not found');
      }
      return files.get(this.uri)?.content ?? '';
    }

    write(content: string): void {
      files.set(this.uri, { content, mtime: Date.now() });
    }

    delete(): void {
      files.delete(this.uri);
    }

    move(destination: File): void {
      if (!this.exists) {
        throw new Error('File not found');
      }
      const data = files.get(this.uri);
      files.delete(this.uri);
      files.set(destination.uri, { content: data?.content ?? '', mtime: Date.now() });
    }

    info(): { exists: boolean; size?: number; modificationTime?: number } {
      if (!this.exists) {
        return { exists: false };
      }
      return {
        exists: true,
        size: this.size,
        modificationTime: this.modificationTime ?? undefined,
      };
    }
  }

  class Directory {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    get exists(): boolean {
      return directories.has(this.uri);
    }

    create(): void {
      directories.add(this.uri);
    }
  }

  const Paths = {
    join: nodePath.join,
    dirname: nodePath.dirname,
    extname: nodePath.extname,
  };

  return { files, directories, setFile, File, Directory, Paths };
});

const { files, directories, setFile } = fileSystem;

vi.mock('expo-file-system', () => ({
  File: fileSystem.File,
  Directory: fileSystem.Directory,
  Paths: fileSystem.Paths,
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17',
    select: (options: { ios?: string; android?: string; default?: string }) =>
      options?.ios ?? options?.default ?? 'ios',
  },
}));

vi.mock('../const', () => ({
  MAX_SYNC_FILE_SIZE: 10 * 1024 * 1024,
  extractTitle: (filePath: string) => filePath.replace(/^.*\//, '').replace(/\.[^/.]+$/, ''),
}));

vi.mock('../api-client', () => ({
  cloudSyncApi: {
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

vi.mock('@/lib/vault/file-index', () => ({
  getEntry: vi.fn(),
  updateEntry: vi.fn(),
  addEntry: vi.fn(),
  removeEntry: vi.fn(),
  saveFileIndex: vi.fn(),
}));

vi.mock('../file-collector', () => ({
  computeHash: vi.fn(async (content: string) => `hash:${content}`),
}));

import {
  executeAction,
  applyChangesToFileIndex,
  type ConflictEntry,
  type DownloadedEntry,
  type StagedApplyOperation,
  type UploadedObjectRef,
} from '../executor';
import { cloudSyncApi } from '../api-client';
import {
  getEntry,
  updateEntry,
  addEntry,
  removeEntry,
  saveFileIndex,
} from '@/lib/vault/file-index';

describe('executor', () => {
  const vaultPath = '/vault';
  const deviceId = 'device-1';

  beforeEach(() => {
    files.clear();
    directories.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads conflict copy first and records size/mtime', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);

    setFile('/vault/note.md', 'local', 456);

    vi.mocked(cloudSyncApi.downloadFile).mockResolvedValue('remote');
    const uploadFileMock = vi.mocked(cloudSyncApi.uploadFile);
    uploadFileMock.mockResolvedValue(undefined);
    const existingEntry: FileEntry = {
      id: 'file-1',
      path: 'note.md',
      createdAt: 1,
      vectorClock: { [deviceId]: 1 },
      lastSyncedHash: null,
      lastSyncedClock: createEmptyClock(),
      lastSyncedSize: null,
      lastSyncedMtime: null,
    };
    vi.mocked(getEntry).mockImplementation((_, fileId) =>
      fileId === 'file-1' ? existingEntry : undefined
    );

    const pendingChanges: Map<string, PendingChange> = new Map([
      [
        'file-1',
        {
          type: 'modified',
          fileId: 'file-1',
          path: 'note.md',
          vectorClock: { [deviceId]: 2 },
          contentHash: 'hash:local',
        },
      ],
    ]);

    const localStates: Map<string, LocalFileState> = new Map([
      [
        'file-1',
        {
          fileId: 'file-1',
          path: 'note.md',
          contentHash: 'hash:local',
          size: 5,
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
        uploadUrl: 'https://upload-local?contentHash=hash%3Alocal',
        conflictRename: 'note (conflict).md',
        conflictCopyId: 'conflict-id',
        conflictCopyUploadUrl: 'https://upload-conflict?contentHash=hash%3Aremote',
        storageRevision: '550e8400-e29b-41d4-a716-446655440010',
        conflictCopyStorageRevision: '550e8400-e29b-41d4-a716-446655440011',
        remoteVectorClock: { remote: 1 },
        uploadContentHash: 'hash:local',
        uploadSize: 5,
      },
      vaultPath,
      'journal-1',
      deviceId,
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

    expect(uploadFileMock).toHaveBeenCalledTimes(2);
    const conflictUploadUrl = new URL(uploadFileMock.mock.calls[0]?.[0] ?? '');
    const localUploadUrl = new URL(uploadFileMock.mock.calls[1]?.[0] ?? '');
    expect(conflictUploadUrl.origin + conflictUploadUrl.pathname).toBe('https://upload-conflict/');
    expect(conflictUploadUrl.searchParams.get('contentHash')).toBe('hash:remote');
    expect(localUploadUrl.origin + localUploadUrl.pathname).toBe('https://upload-local/');
    expect(localUploadUrl.searchParams.get('contentHash')).toBe('hash:local');

    expect(conflictEntries).toHaveLength(1);
    const conflict = conflictEntries[0];
    expect(conflict.originalSize).toBe(5);
    expect(conflict.originalMtime).toBe(456);
    expect(conflict.conflictCopySize).toBe(6);
    expect(conflict.conflictCopyMtime).toBe(123);

    expect(receipts).toEqual([
      {
        actionId: 'action-conflict-1',
        receiptToken: 'receipt-conflict-1',
      },
    ]);
    expect(completedFileIds).toEqual(['file-1', 'conflict-id']);
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
        contentHash: 'hash:remote',
      },
      {
        fileId: 'file-1',
        storageRevision: '550e8400-e29b-41d4-a716-446655440010',
        contentHash: 'hash:local',
      },
    ]);
    expect(files.has('/vault/note (conflict).md')).toBe(false);
    expect(addEntry).not.toHaveBeenCalled();
    expect(saveFileIndex).not.toHaveBeenCalled();
  });

  it('applyChangesToFileIndex writes back size/mtime', async () => {
    const pendingChanges: Map<string, PendingChange> = new Map([
      [
        'file-1',
        {
          type: 'modified',
          fileId: 'file-1',
          path: 'note.md',
          vectorClock: { [deviceId]: 2 },
          contentHash: 'hash-1',
        },
      ],
    ]);

    const localStates: Map<string, LocalFileState> = new Map([
      [
        'file-1',
        {
          fileId: 'file-1',
          path: 'note.md',
          contentHash: 'hash-1',
          size: 10,
          mtime: 111,
        },
      ],
    ]);

    const remoteEntry: FileEntry = {
      id: 'file-2',
      path: 'remote.md',
      createdAt: 1,
      vectorClock: createEmptyClock(),
      lastSyncedHash: null,
      lastSyncedClock: createEmptyClock(),
      lastSyncedSize: null,
      lastSyncedMtime: null,
    };

    vi.mocked(getEntry).mockImplementation((_, fileId) =>
      fileId === 'file-2' ? remoteEntry : undefined
    );

    await applyChangesToFileIndex(
      vaultPath,
      pendingChanges,
      {
        receipts: [],
        completedFileIds: [],
        deleted: [{ fileId: 'file-3' }],
        downloadedEntries: [
          {
            fileId: 'file-2',
            path: 'remote.md',
            vectorClock: {},
            contentHash: 'hash-2',
            size: 20,
            mtime: 222,
          },
        ],
        conflictEntries: [
          {
            originalFileId: 'file-4',
            originalPath: 'note.md',
            mergedClock: {},
            contentHash: 'hash-4',
            originalSize: 30,
            originalMtime: 333,
            conflictCopyId: 'file-5',
            conflictCopyPath: 'note (conflict).md',
            conflictCopyClock: {},
            conflictCopyHash: 'hash-5',
            conflictCopySize: 40,
            conflictCopyMtime: 444,
          },
        ],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      new Set(['file-1']),
      localStates
    );

    expect(updateEntry).toHaveBeenCalledWith(
      vaultPath,
      'file-1',
      expect.objectContaining({ lastSyncedSize: 10, lastSyncedMtime: 111 })
    );
    expect(updateEntry).toHaveBeenCalledWith(
      vaultPath,
      'file-2',
      expect.objectContaining({ lastSyncedSize: 20, lastSyncedMtime: 222 })
    );
    expect(updateEntry).toHaveBeenCalledWith(
      vaultPath,
      'file-4',
      expect.objectContaining({ lastSyncedSize: 30, lastSyncedMtime: 333 })
    );

    expect(addEntry).toHaveBeenCalledWith(
      vaultPath,
      expect.objectContaining({ id: 'file-5', lastSyncedSize: 40, lastSyncedMtime: 444 })
    );
    expect(removeEntry).toHaveBeenCalledWith(vaultPath, 'file-3');
    expect(saveFileIndex).toHaveBeenCalledWith(vaultPath);
  });

  it('removes old path when download moves to new path', async () => {
    setFile('/vault/old.md', 'local', 111);

    vi.mocked(cloudSyncApi.downloadFile).mockResolvedValue('remote');

    const pendingChanges = new Map<string, PendingChange>();
    const localStates: Map<string, LocalFileState> = new Map([
      [
        'file-1',
        {
          fileId: 'file-1',
          path: 'old.md',
          contentHash: 'hash:local',
          size: 5,
          mtime: 111,
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
        action: 'download',
        actionId: 'action-download-1',
        receiptToken: 'receipt-download-1',
        fileId: 'file-1',
        path: 'new.md',
        url: 'https://download',
        contentHash: 'hash:remote',
      },
      vaultPath,
      'journal-1',
      deviceId,
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

    expect(files.get('/vault/old.md')?.content).toBe('local');
    expect(files.has('/vault/new.md')).toBe(false);
    expect(stagedOperations).toEqual([
      expect.objectContaining({
        type: 'write_file',
        fileId: 'file-1',
        targetPath: 'new.md',
        replacePath: 'old.md',
      }),
    ]);
  });

  it('reports expectedHash on delete when action carries contentHash', async () => {
    setFile('/vault/deleted.md', 'to-delete', 100);

    const pendingChanges = new Map<string, PendingChange>();
    const localStates = new Map<string, LocalFileState>();
    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

    await executeAction(
      {
        action: 'delete',
        actionId: 'action-delete-1',
        receiptToken: 'receipt-delete-1',
        fileId: 'file-del',
        path: 'deleted.md',
        contentHash: 'hash-remote',
      },
      vaultPath,
      'journal-1',
      deviceId,
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

    expect(deleted).toEqual([{ fileId: 'file-del', expectedHash: 'hash-remote' }]);
    expect(receipts).toEqual([
      {
        actionId: 'action-delete-1',
        receiptToken: 'receipt-delete-1',
      },
    ]);
    expect(completedFileIds).toEqual(['file-del']);
    expect(stagedOperations).toEqual([
      {
        type: 'delete_file',
        fileId: 'file-del',
        targetPath: 'deleted.md',
      },
    ]);
  });

  it('rejects path escaping vault boundary', async () => {
    const pendingChanges = new Map<string, PendingChange>();
    const localStates = new Map<string, LocalFileState>();
    const receipts: SyncActionReceiptDto[] = [];
    const completedFileIds: string[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];
    const stagedOperations: StagedApplyOperation[] = [];
    const uploadedObjects: UploadedObjectRef[] = [];

    await expect(
      executeAction(
        {
          action: 'download',
          actionId: 'action-download-escape',
          receiptToken: 'receipt-download-escape',
          fileId: 'file-escape',
          path: '../escape.md',
          url: 'https://download',
          contentHash: 'hash-escape',
        },
        vaultPath,
        'journal-1',
        deviceId,
        pendingChanges,
        localStates,
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
