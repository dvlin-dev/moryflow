/**
 * [INPUT]: executor actions
 * [OUTPUT]: execution results and FileIndex writebacks
 * [POS]: Mobile Cloud Sync executor tests
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { FileEntry } from '@moryflow/api';
import type { CompletedFileDto } from '@moryflow/api/cloud-sync';
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

    const completed: CompletedFileDto[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await executeAction(
      {
        action: 'conflict',
        fileId: 'file-1',
        path: 'note.md',
        url: 'https://download',
        uploadUrl: 'https://upload-local',
        conflictRename: 'note (conflict).md',
        conflictCopyId: 'conflict-id',
        conflictCopyUploadUrl: 'https://upload-conflict',
        remoteVectorClock: { remote: 1 },
      },
      vaultPath,
      deviceId,
      pendingChanges,
      localStates,
      completed,
      deleted,
      downloadedEntries,
      conflictEntries
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

    expect(completed[0]?.vectorClock?.[deviceId]).toBe(3);
    expect(completed.some((item) => item.fileId === 'conflict-id')).toBe(true);
    expect(addEntry).toHaveBeenCalledWith(
      vaultPath,
      expect.objectContaining({
        id: 'conflict-id',
        path: 'note (conflict).md',
        lastSyncedHash: 'hash:remote',
      })
    );
    expect(saveFileIndex).toHaveBeenCalledWith(vaultPath);
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
        completed: [],
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

    const completed: CompletedFileDto[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await executeAction(
      {
        action: 'download',
        fileId: 'file-1',
        path: 'new.md',
        url: 'https://download',
        contentHash: 'hash:remote',
      },
      vaultPath,
      deviceId,
      pendingChanges,
      localStates,
      completed,
      deleted,
      downloadedEntries,
      conflictEntries
    );

    expect(files.has('/vault/old.md')).toBe(false);
    expect(files.get('/vault/new.md')?.content).toBe('remote');
  });

  it('reports expectedHash on delete when action carries contentHash', async () => {
    setFile('/vault/deleted.md', 'to-delete', 100);

    const pendingChanges = new Map<string, PendingChange>();
    const localStates = new Map<string, LocalFileState>();
    const completed: CompletedFileDto[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await executeAction(
      {
        action: 'delete',
        fileId: 'file-del',
        path: 'deleted.md',
        contentHash: 'hash-remote',
      },
      vaultPath,
      deviceId,
      pendingChanges,
      localStates,
      completed,
      deleted,
      downloadedEntries,
      conflictEntries
    );

    expect(deleted).toEqual([{ fileId: 'file-del', expectedHash: 'hash-remote' }]);
  });

  it('rejects path escaping vault boundary', async () => {
    const pendingChanges = new Map<string, PendingChange>();
    const localStates = new Map<string, LocalFileState>();
    const completed: CompletedFileDto[] = [];
    const deleted: Array<{ fileId: string; expectedHash?: string }> = [];
    const downloadedEntries: DownloadedEntry[] = [];
    const conflictEntries: ConflictEntry[] = [];

    await expect(
      executeAction(
        {
          action: 'download',
          fileId: 'file-escape',
          path: '../escape.md',
          url: 'https://download',
          contentHash: 'hash-escape',
        },
        vaultPath,
        deviceId,
        pendingChanges,
        localStates,
        completed,
        deleted,
        downloadedEntries,
        conflictEntries
      )
    ).rejects.toThrow('outside vault');
  });
});
