/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import {
  createApplyJournal,
  getStagingDir,
  readApplyJournal,
  type ApplyJournalRecord,
} from '../apply-journal.js';
import { recoverPendingApply } from '../recovery-coordinator.js';

const { cleanupOrphansMock, publishFileIndexChangesMock } = vi.hoisted(() => ({
  cleanupOrphansMock: vi.fn(async () => undefined),
  publishFileIndexChangesMock: vi.fn(),
}));

vi.mock('../api/client.js', () => ({
  cloudSyncApi: {
    cleanupOrphans: cleanupOrphansMock,
  },
}));

vi.mock('../file-index-publisher.js', () => ({
  publishFileIndexChanges: publishFileIndexChangesMock,
}));

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-recovery-'));
};

const PROFILE_KEY = 'user-1:workspace-1';
const WORKSPACE_ID = 'workspace-1';

describe('recoverPendingApply', () => {
  let vaultPath = '';

  beforeEach(async () => {
    vaultPath = await createVault();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('replays committed staged operations before clearing journal', async () => {
    const tempFilePath = path.join(
      getStagingDir(vaultPath, PROFILE_KEY, 'journal-1'),
      'action-1.md'
    );
    await createApplyJournal(vaultPath, PROFILE_KEY, {
      journalId: 'journal-1',
      createdAt: Date.now(),
      phase: 'committed',
      uploadedObjects: [],
      stagedOperations: [
        {
          type: 'write_file',
          fileId: 'file-1',
          tempFilePath,
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
    await writeFile(tempFilePath, 'remote-content', 'utf8');

    const recovered = await recoverPendingApply({
      vaultPath,
      profileKey: PROFILE_KEY,
      workspaceId: WORKSPACE_ID,
      vaultId: 'vault-1',
    });

    expect(recovered).toBe(true);
    expect(await readFile(path.join(vaultPath, 'notes/a.md'), 'utf8')).toBe('remote-content');
    expect(publishFileIndexChangesMock).toHaveBeenCalledOnce();
    expect(await readApplyJournal(vaultPath, PROFILE_KEY)).toBeNull();
  });

  it('does not delete existing file before staged temp is verified during committed replay', async () => {
    const oldPath = path.join(vaultPath, 'notes/old.md');
    await mkdir(path.dirname(oldPath), { recursive: true });
    await writeFile(oldPath, 'local-content', 'utf8');

    await createApplyJournal(vaultPath, PROFILE_KEY, {
      journalId: 'journal-missing-temp',
      createdAt: Date.now(),
      phase: 'committed',
      uploadedObjects: [],
      stagedOperations: [
        {
          type: 'write_file',
          fileId: 'file-1',
          tempFilePath: path.join(
            vaultPath,
            '.moryflow/cloud-sync/staging/journal-missing-temp/missing.md'
          ),
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
        vaultPath,
        profileKey: PROFILE_KEY,
        workspaceId: WORKSPACE_ID,
        vaultId: 'vault-1',
      })
    ).rejects.toThrow('Missing staged file');

    expect(await readFile(oldPath, 'utf8')).toBe('local-content');
    expect(await readApplyJournal(vaultPath, PROFILE_KEY)).not.toBeNull();
    expect(publishFileIndexChangesMock).not.toHaveBeenCalled();
  });

  it('cleans up uploaded orphans for prepared journal before clearing state', async () => {
    await createApplyJournal(vaultPath, PROFILE_KEY, {
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
      vaultPath,
      profileKey: PROFILE_KEY,
      workspaceId: WORKSPACE_ID,
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
    expect(await readApplyJournal(vaultPath, PROFILE_KEY)).toBeNull();
  });

  it('drops stale recovery journal when journal ownership does not match current binding', async () => {
    await createApplyJournal(vaultPath, PROFILE_KEY, {
      journalId: 'journal-stale',
      createdAt: Date.now(),
      phase: 'prepared',
      vaultId: 'vault-old',
      userId: 'user-old',
      uploadedObjects: [
        {
          fileId: 'file-old',
          storageRevision: '550e8400-e29b-41d4-a716-446655440099',
          contentHash: 'hash-old',
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
      vaultPath,
      profileKey: PROFILE_KEY,
      workspaceId: WORKSPACE_ID,
      vaultId: 'vault-new',
      currentUserId: 'user-new',
    });

    expect(recovered).toBe(true);
    expect(cleanupOrphansMock).toHaveBeenCalledWith({
      vaultId: 'vault-old',
      objects: [
        {
          fileId: 'file-old',
          storageRevision: '550e8400-e29b-41d4-a716-446655440099',
          contentHash: 'hash-old',
        },
      ],
    });
    expect(publishFileIndexChangesMock).not.toHaveBeenCalled();
    expect(await readApplyJournal(vaultPath, PROFILE_KEY)).toBeNull();
  });

  it('cleans up executing journal without publishing file index', async () => {
    await createApplyJournal(vaultPath, PROFILE_KEY, {
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
      vaultPath,
      profileKey: PROFILE_KEY,
      workspaceId: WORKSPACE_ID,
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
    expect(await readApplyJournal(vaultPath, PROFILE_KEY)).toBeNull();
  });
});
