import { beforeEach, describe, expect, it, vi } from 'vitest';

const fileSystem = vi.hoisted(() => {
  const nodePath = require('node:path') as typeof import('node:path');
  const files = new Map<string, { content: string; mtime: number }>();
  const directories = new Set<string>();

  class File {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    get exists(): boolean {
      return files.has(this.uri);
    }

    get modificationTime(): number | null {
      return files.get(this.uri)?.mtime ?? null;
    }

    textSync(): string {
      const data = files.get(this.uri);
      if (!data) {
        throw new Error('File not found');
      }
      return data.content;
    }

    write(content: string): void {
      files.set(this.uri, { content, mtime: Date.now() });
    }

    delete(): void {
      files.delete(this.uri);
    }

    move(destination: File): void {
      const data = files.get(this.uri);
      if (!data) {
        throw new Error('File not found');
      }
      files.delete(this.uri);
      files.set(destination.uri, { content: data.content, mtime: Date.now() });
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

    delete(): void {
      directories.delete(this.uri);
      for (const filePath of [...files.keys()]) {
        if (filePath.startsWith(`${this.uri}${nodePath.sep}`)) {
          files.delete(filePath);
        }
      }
    }
  }

  const Paths = {
    join: nodePath.join,
    dirname: nodePath.dirname,
    extname: nodePath.extname,
  };

  return { files, directories, File, Directory, Paths };
});

const { cleanupOrphansMock, publishFileIndexChangesMock } = vi.hoisted(() => ({
  cleanupOrphansMock: vi.fn(),
  publishFileIndexChangesMock: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
  File: fileSystem.File,
  Directory: fileSystem.Directory,
  Paths: fileSystem.Paths,
}));

vi.mock('../api-client', () => ({
  cloudSyncApi: {
    cleanupOrphans: cleanupOrphansMock,
  },
}));

vi.mock('../file-index-publisher', () => ({
  publishFileIndexChanges: publishFileIndexChangesMock,
}));

import { createApplyJournal, readApplyJournal, type ApplyJournalRecord } from '../apply-journal';
import { recoverPendingApply } from '../recovery-coordinator';

describe('recoverPendingApply', () => {
  beforeEach(() => {
    fileSystem.files.clear();
    fileSystem.directories.clear();
    vi.clearAllMocks();
  });

  it('replays committed staged operations before clearing journal', async () => {
    await createApplyJournal('/vault', {
      journalId: 'journal-1',
      createdAt: Date.now(),
      phase: 'committed',
      uploadedObjects: [],
      stagedOperations: [
        {
          type: 'write_file',
          fileId: 'file-1',
          tempFilePath: '/vault/.moryflow/cloud-sync/staging/journal-1/action-1.md',
          targetPath: 'notes/a.md',
        },
      ],
      executeResult: {
        receipts: [],
        completedFileIds: ['file-1'],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      pendingChanges: [],
      localStates: [],
    } satisfies ApplyJournalRecord);
    fileSystem.files.set('/vault/.moryflow/cloud-sync/staging/journal-1/action-1.md', {
      content: 'remote-content',
      mtime: 1,
    });

    const recovered = await recoverPendingApply({
      vaultPath: '/vault',
      vaultId: 'vault-1',
    });

    expect(recovered).toBe(true);
    expect(fileSystem.files.get('/vault/notes/a.md')?.content).toBe('remote-content');
    expect(publishFileIndexChangesMock).toHaveBeenCalledOnce();
    expect(await readApplyJournal('/vault')).toBeNull();
  });

  it('does not delete existing file before staged temp is verified during committed replay', async () => {
    fileSystem.files.set('/vault/notes/old.md', {
      content: 'local-content',
      mtime: 1,
    });

    await createApplyJournal('/vault', {
      journalId: 'journal-missing-temp',
      createdAt: Date.now(),
      phase: 'committed',
      uploadedObjects: [],
      stagedOperations: [
        {
          type: 'write_file',
          fileId: 'file-1',
          tempFilePath: '/vault/.moryflow/cloud-sync/staging/journal-missing-temp/missing.md',
          targetPath: 'notes/new.md',
          replacePath: 'notes/old.md',
        },
      ],
      executeResult: {
        receipts: [],
        completedFileIds: ['file-1'],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      pendingChanges: [],
      localStates: [],
    } satisfies ApplyJournalRecord);

    await expect(
      recoverPendingApply({
        vaultPath: '/vault',
        vaultId: 'vault-1',
      })
    ).rejects.toThrow('Missing staged file');

    expect(fileSystem.files.get('/vault/notes/old.md')?.content).toBe('local-content');
    expect(await readApplyJournal('/vault')).not.toBeNull();
    expect(publishFileIndexChangesMock).not.toHaveBeenCalled();
  });

  it('cleans up uploaded orphans for prepared journal before clearing state', async () => {
    await createApplyJournal('/vault', {
      journalId: 'journal-2',
      createdAt: Date.now(),
      phase: 'prepared',
      uploadedObjects: [
        {
          fileId: 'file-1',
          storageRevision: '550e8400-e29b-41d4-a716-446655440010',
          contentHash: 'hash-1',
        },
      ],
      stagedOperations: [],
      executeResult: {
        receipts: [],
        completedFileIds: [],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      pendingChanges: [],
      localStates: [],
    } satisfies ApplyJournalRecord);

    const recovered = await recoverPendingApply({
      vaultPath: '/vault',
      vaultId: 'vault-2',
    });

    expect(recovered).toBe(true);
    expect(cleanupOrphansMock).toHaveBeenCalledWith({
      vaultId: 'vault-2',
      objects: [
        {
          fileId: 'file-1',
          storageRevision: '550e8400-e29b-41d4-a716-446655440010',
          contentHash: 'hash-1',
        },
      ],
    });
    expect(await readApplyJournal('/vault')).toBeNull();
  });

  it('cleans up executing journal without publishing file index', async () => {
    await createApplyJournal('/vault', {
      journalId: 'journal-3',
      createdAt: Date.now(),
      phase: 'executing',
      uploadedObjects: [
        {
          fileId: 'file-2',
          storageRevision: '550e8400-e29b-41d4-a716-446655440020',
          contentHash: 'hash-2',
        },
      ],
      stagedOperations: [
        {
          type: 'delete_file',
          fileId: 'file-2',
          targetPath: 'notes/b.md',
        },
      ],
      executeResult: {
        receipts: [],
        completedFileIds: [],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      pendingChanges: [],
      localStates: [],
    } satisfies ApplyJournalRecord);

    const recovered = await recoverPendingApply({
      vaultPath: '/vault',
      vaultId: 'vault-3',
    });

    expect(recovered).toBe(true);
    expect(cleanupOrphansMock).toHaveBeenCalledWith({
      vaultId: 'vault-3',
      objects: [
        {
          fileId: 'file-2',
          storageRevision: '550e8400-e29b-41d4-a716-446655440020',
          contentHash: 'hash-2',
        },
      ],
    });
    expect(publishFileIndexChangesMock).not.toHaveBeenCalled();
    expect(await readApplyJournal('/vault')).toBeNull();
  });
});
