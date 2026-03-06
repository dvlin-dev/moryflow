/**
 * [INPUT]: SyncActionDto[], vaultPath
 * [OUTPUT]: ExecuteResult（receipts/staged file info/errors）+ 提交后 FileIndex 变更
 * [POS]: Mobile 云同步执行器，负责同步动作执行与 commit 后 FileIndex 发布
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { File, Paths } from 'expo-file-system';
import type { SyncActionDto, SyncActionReceiptDto } from '@moryflow/api/cloud-sync';
import type { VectorClock } from '@moryflow/sync';
import {
  createEmptyClock,
  incrementClock,
  isSafeRelativeSyncPath,
  mergeVectorClocks,
  normalizeSyncPath,
} from '@moryflow/sync';
import {
  addEntry,
  getEntry,
  removeEntry,
  saveFileIndex,
  updateEntry,
} from '@/lib/vault/file-index';
import { createStagingFilePath } from './apply-journal';
import { cloudSyncApi } from './api-client';
import { computeHash, type LocalFileState, type PendingChange } from './file-collector';

const readFileInfo = (file: File): { size: number; mtime: number | null } => {
  try {
    const info = file.info();
    return {
      size: typeof info.size === 'number' ? info.size : (file.size ?? 0),
      mtime:
        typeof info.modificationTime === 'number'
          ? info.modificationTime
          : (file.modificationTime ?? null),
    };
  } catch {
    return {
      size: file.size ?? 0,
      mtime: file.modificationTime ?? null,
    };
  }
};

const resolveSafePath = (vaultPath: string, relativePath: string): string => {
  const normalized = normalizeSyncPath(relativePath);
  if (!isSafeRelativeSyncPath(normalized)) {
    throw new Error(`Refusing to access path outside vault: ${relativePath}`);
  }
  return Paths.join(vaultPath, normalized);
};

export interface DeletedEntry {
  fileId: string;
  expectedHash?: string;
}

export interface DownloadedEntry {
  fileId: string;
  path: string;
  vectorClock: VectorClock;
  contentHash: string;
  size: number;
  mtime: number | null;
}

export interface ConflictEntry {
  originalFileId: string;
  originalPath: string;
  mergedClock: VectorClock;
  contentHash: string;
  originalSize: number;
  originalMtime: number | null;
  conflictCopyId: string;
  conflictCopyPath: string;
  conflictCopyClock: VectorClock;
  conflictCopyHash: string;
  conflictCopySize: number;
  conflictCopyMtime: number | null;
}

export interface UploadedObjectRef {
  fileId: string;
  storageRevision: string;
  contentHash: string;
}

export type StagedApplyOperation =
  | {
      type: 'write_file';
      fileId: string;
      tempFilePath: string;
      targetPath: string;
      replacePath?: string;
    }
  | {
      type: 'rename_file';
      fileId: string;
      sourcePath: string;
      targetPath: string;
    }
  | {
      type: 'delete_file';
      fileId: string;
      targetPath: string;
    };

export interface ExecuteResult {
  receipts: SyncActionReceiptDto[];
  completedFileIds: string[];
  deleted: DeletedEntry[];
  downloadedEntries: DownloadedEntry[];
  conflictEntries: ConflictEntry[];
  stagedOperations: StagedApplyOperation[];
  uploadedObjects: UploadedObjectRef[];
  errors: Array<{ action: SyncActionDto; error: Error }>;
}

export const executeAction = async (
  action: SyncActionDto,
  vaultPath: string,
  journalId: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  localStates: Map<string, LocalFileState>,
  receipts: SyncActionReceiptDto[],
  completedFileIds: string[],
  deleted: DeletedEntry[],
  downloadedEntries: DownloadedEntry[],
  conflictEntries: ConflictEntry[],
  stagedOperations: StagedApplyOperation[],
  uploadedObjects: UploadedObjectRef[]
): Promise<void> => {
  const absolutePath = resolveSafePath(vaultPath, action.path);

  switch (action.action) {
    case 'upload': {
      if (!action.url) return;

      const file = new File(absolutePath);
      const content = file.textSync();
      const bytes = new TextEncoder().encode(content);
      const hash = await computeHash(content);

      if (action.contentHash && hash !== action.contentHash) {
        throw new Error('upload contract mismatch: content hash changed after diff');
      }
      if (typeof action.size === 'number' && bytes.length !== action.size) {
        throw new Error('upload contract mismatch: file size changed after diff');
      }

      await cloudSyncApi.uploadFile(action.url, bytes);
      receipts.push({
        actionId: action.actionId,
        receiptToken: action.receiptToken,
      });
      completedFileIds.push(action.fileId);
      if (action.storageRevision) {
        uploadedObjects.push({
          fileId: action.fileId,
          storageRevision: action.storageRevision,
          contentHash: hash,
        });
      }
      break;
    }

    case 'download': {
      if (!action.url) return;

      const localState = localStates.get(action.fileId);
      const canSkip =
        localState && action.contentHash && localState.contentHash === action.contentHash;

      if (canSkip) {
        if (localState.path !== action.path) {
          stagedOperations.push({
            type: 'rename_file',
            fileId: action.fileId,
            sourcePath: localState.path,
            targetPath: action.path,
          });
        }

        const remoteClock = action.remoteVectorClock ?? createEmptyClock();
        const localEntry = getEntry(vaultPath, action.fileId);
        const mergedClock = localEntry
          ? mergeVectorClocks(localEntry.vectorClock, remoteClock)
          : remoteClock;

        receipts.push({
          actionId: action.actionId,
          receiptToken: action.receiptToken,
        });
        completedFileIds.push(action.fileId);
        downloadedEntries.push({
          fileId: action.fileId,
          path: action.path,
          vectorClock: mergedClock,
          contentHash: localState.contentHash,
          size: localState.size,
          mtime: localState.mtime,
        });
        break;
      }

      const content = await cloudSyncApi.downloadFile(action.url);
      const bytes = new TextEncoder().encode(content);
      const actualHash = await computeHash(content);
      if (action.contentHash && actualHash !== action.contentHash) {
        throw new Error('download contract mismatch: remote content hash changed');
      }
      if (typeof action.size === 'number' && bytes.length !== action.size) {
        throw new Error('download contract mismatch: remote file size changed');
      }

      const tempFilePath = await createStagingFilePath(
        vaultPath,
        journalId,
        action.actionId,
        action.path
      );
      new File(tempFilePath).write(content);

      receipts.push({
        actionId: action.actionId,
        receiptToken: action.receiptToken,
      });
      completedFileIds.push(action.fileId);
      stagedOperations.push({
        type: 'write_file',
        fileId: action.fileId,
        tempFilePath,
        targetPath: action.path,
        replacePath: localState && localState.path !== action.path ? localState.path : undefined,
      });
      downloadedEntries.push({
        fileId: action.fileId,
        path: action.path,
        vectorClock: action.remoteVectorClock ?? createEmptyClock(),
        contentHash: actualHash,
        size: bytes.length,
        mtime: Date.now(),
      });
      break;
    }

    case 'delete': {
      deleted.push({
        fileId: action.fileId,
        expectedHash: action.contentHash,
      });
      stagedOperations.push({
        type: 'delete_file',
        fileId: action.fileId,
        targetPath: action.path,
      });
      receipts.push({
        actionId: action.actionId,
        receiptToken: action.receiptToken,
      });
      completedFileIds.push(action.fileId);
      break;
    }

    case 'conflict': {
      if (!action.conflictRename || !action.url || !action.uploadUrl) {
        throw new Error('Invalid conflict action: missing conflict metadata');
      }
      if (!action.conflictCopyId || !action.conflictCopyUploadUrl) {
        throw new Error('Invalid conflict action: missing conflict copy info');
      }

      const remoteContent = await cloudSyncApi.downloadFile(action.url);
      const remoteBytes = new TextEncoder().encode(remoteContent);
      const remoteHash = await computeHash(remoteContent);
      if (action.contentHash && remoteHash !== action.contentHash) {
        throw new Error('conflict download contract mismatch: remote content hash changed');
      }
      if (typeof action.size === 'number' && remoteBytes.length !== action.size) {
        throw new Error('conflict download contract mismatch: remote file size changed');
      }

      const conflictTempFilePath = await createStagingFilePath(
        vaultPath,
        journalId,
        `${action.actionId}-conflict-copy`,
        action.conflictRename
      );
      new File(conflictTempFilePath).write(remoteContent);

      await cloudSyncApi.uploadFile(action.conflictCopyUploadUrl, remoteBytes);
      if (action.conflictCopyStorageRevision) {
        uploadedObjects.push({
          fileId: action.conflictCopyId,
          storageRevision: action.conflictCopyStorageRevision,
          contentHash: remoteHash,
        });
      }

      const localFile = new File(absolutePath);
      const localContent = localFile.textSync();
      const localBytes = new TextEncoder().encode(localContent);
      const localHash = await computeHash(localContent);
      if (action.uploadContentHash && localHash !== action.uploadContentHash) {
        throw new Error('conflict upload contract mismatch: local content changed after diff');
      }
      if (typeof action.uploadSize === 'number' && localBytes.length !== action.uploadSize) {
        throw new Error('conflict upload contract mismatch: local size changed after diff');
      }

      await cloudSyncApi.uploadFile(action.uploadUrl, localBytes);
      if (action.storageRevision) {
        uploadedObjects.push({
          fileId: action.fileId,
          storageRevision: action.storageRevision,
          contentHash: localHash,
        });
      }

      const localState = localStates.get(action.fileId);
      const localInfo = readFileInfo(localFile);
      const remoteClock = action.remoteVectorClock ?? createEmptyClock();
      const pending = pendingChanges.get(action.fileId);
      const localClock = pending?.vectorClock ?? createEmptyClock();
      const finalClock = incrementClock(mergeVectorClocks(localClock, remoteClock), deviceId);

      receipts.push({
        actionId: action.actionId,
        receiptToken: action.receiptToken,
      });
      completedFileIds.push(action.fileId, action.conflictCopyId);
      stagedOperations.push({
        type: 'write_file',
        fileId: action.conflictCopyId,
        tempFilePath: conflictTempFilePath,
        targetPath: action.conflictRename,
      });
      conflictEntries.push({
        originalFileId: action.fileId,
        originalPath: action.path,
        mergedClock: finalClock,
        contentHash: localHash,
        originalSize: localState?.size ?? localBytes.length,
        originalMtime: localState?.mtime ?? localInfo.mtime,
        conflictCopyId: action.conflictCopyId,
        conflictCopyPath: action.conflictRename,
        conflictCopyClock: remoteClock,
        conflictCopyHash: remoteHash,
        conflictCopySize: remoteBytes.length,
        conflictCopyMtime: Date.now(),
      });
      break;
    }
  }
};

export const executeActions = async (
  actions: SyncActionDto[],
  vaultPath: string,
  journalId: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  localStates: Map<string, LocalFileState>
): Promise<ExecuteResult> => {
  const receipts: SyncActionReceiptDto[] = [];
  const completedFileIds: string[] = [];
  const deleted: DeletedEntry[] = [];
  const downloadedEntries: DownloadedEntry[] = [];
  const conflictEntries: ConflictEntry[] = [];
  const stagedOperations: StagedApplyOperation[] = [];
  const uploadedObjects: UploadedObjectRef[] = [];
  const errors: Array<{ action: SyncActionDto; error: Error }> = [];

  for (const action of actions) {
    try {
      await executeAction(
        action,
        vaultPath,
        journalId,
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
    } catch (error) {
      errors.push({
        action,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      console.error('[CloudSync] Execute action failed:', action.action, action.path, error);
    }
  }

  return {
    receipts,
    completedFileIds,
    deleted,
    downloadedEntries,
    conflictEntries,
    stagedOperations,
    uploadedObjects,
    errors,
  };
};

export const applyChangesToFileIndex = async (
  vaultPath: string,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>,
  localStates: Map<string, LocalFileState>
): Promise<void> => {
  for (const [fileId, change] of pendingChanges) {
    if (!completedIds.has(fileId)) continue;

    switch (change.type) {
      case 'new':
      case 'modified': {
        const localState = localStates.get(fileId);
        updateEntry(vaultPath, fileId, {
          vectorClock: change.vectorClock,
          lastSyncedHash: change.contentHash,
          lastSyncedClock: change.vectorClock,
          lastSyncedSize: localState?.size ?? null,
          lastSyncedMtime: localState?.mtime ?? null,
        });
        break;
      }
      case 'deleted': {
        removeEntry(vaultPath, fileId);
        break;
      }
    }
  }

  for (const entry of executeResult.downloadedEntries) {
    const existing = getEntry(vaultPath, entry.fileId);
    if (existing) {
      updateEntry(vaultPath, entry.fileId, {
        path: entry.path,
        vectorClock: entry.vectorClock,
        lastSyncedHash: entry.contentHash,
        lastSyncedClock: entry.vectorClock,
        lastSyncedSize: entry.size,
        lastSyncedMtime: entry.mtime,
      });
    } else {
      addEntry(vaultPath, {
        id: entry.fileId,
        path: entry.path,
        createdAt: Date.now(),
        vectorClock: entry.vectorClock,
        lastSyncedHash: entry.contentHash,
        lastSyncedClock: entry.vectorClock,
        lastSyncedSize: entry.size,
        lastSyncedMtime: entry.mtime,
      });
    }
  }

  for (const deleted of executeResult.deleted) {
    removeEntry(vaultPath, deleted.fileId);
  }

  for (const conflict of executeResult.conflictEntries) {
    updateEntry(vaultPath, conflict.originalFileId, {
      vectorClock: conflict.mergedClock,
      lastSyncedHash: conflict.contentHash,
      lastSyncedClock: conflict.mergedClock,
      lastSyncedSize: conflict.originalSize,
      lastSyncedMtime: conflict.originalMtime,
    });

    const existingConflictCopy = getEntry(vaultPath, conflict.conflictCopyId);
    if (existingConflictCopy) {
      updateEntry(vaultPath, conflict.conflictCopyId, {
        path: conflict.conflictCopyPath,
        vectorClock: conflict.conflictCopyClock,
        lastSyncedHash: conflict.conflictCopyHash,
        lastSyncedClock: conflict.conflictCopyClock,
        lastSyncedSize: conflict.conflictCopySize,
        lastSyncedMtime: conflict.conflictCopyMtime,
      });
    } else {
      addEntry(vaultPath, {
        id: conflict.conflictCopyId,
        path: conflict.conflictCopyPath,
        createdAt: Date.now(),
        vectorClock: conflict.conflictCopyClock,
        lastSyncedHash: conflict.conflictCopyHash,
        lastSyncedClock: conflict.conflictCopyClock,
        lastSyncedSize: conflict.conflictCopySize,
        lastSyncedMtime: conflict.conflictCopyMtime,
      });
    }
  }

  await saveFileIndex(vaultPath);
};
