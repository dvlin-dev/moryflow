/**
 * [INPUT]: SyncActionDto[], vaultPath
 * [OUTPUT]: ExecuteResult (completed, deleted, errors)
 * [POS]: 执行具体的同步操作（上传、下载、删除、冲突处理，写回 size/mtime，冲突副本写入 FileIndex）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { File, Directory, Paths } from 'expo-file-system';
import type { SyncActionDto, CompletedFileDto } from '@moryflow/api/cloud-sync';
import type { VectorClock } from '@moryflow/sync';
import { createEmptyClock, incrementClock, mergeVectorClocks } from '@moryflow/sync';
import {
  getEntry,
  updateEntry,
  addEntry,
  removeEntry,
  saveFileIndex,
} from '@/lib/vault/file-index';
import { cloudSyncApi } from './api-client';
import { computeHash, type PendingChange, type LocalFileState } from './file-collector';
import { extractTitle } from './const';

/** 获取文件的 vectorClock */
const getVectorClock = (vaultPath: string, fileId: string) => {
  const entry = getEntry(vaultPath, fileId);
  return entry?.vectorClock ?? createEmptyClock();
};

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

// ── 执行单个同步操作 ────────────────────────────────────────

export const executeAction = async (
  action: SyncActionDto,
  vaultPath: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  localStates: Map<string, LocalFileState>,
  completed: CompletedFileDto[],
  deleted: string[],
  downloadedEntries: DownloadedEntry[],
  conflictEntries: ConflictEntry[]
): Promise<void> => {
  const absolutePath = Paths.join(vaultPath, action.path);

  switch (action.action) {
    case 'upload': {
      if (!action.url) return;
      const file = new File(absolutePath);
      const content = file.textSync();
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);

      await cloudSyncApi.uploadFile(action.url, bytes);

      const hash = await computeHash(content);
      const pending = pendingChanges.get(action.fileId);
      completed.push({
        fileId: action.fileId,
        action: 'upload',
        path: action.path,
        title: extractTitle(action.path),
        size: bytes.length,
        contentHash: hash,
        vectorClock: pending?.vectorClock ?? getVectorClock(vaultPath, action.fileId),
        expectedHash: pending?.expectedHash,
      });
      break;
    }

    case 'download': {
      if (!action.url) return;

      const localState = localStates.get(action.fileId);
      const canSkip =
        localState && action.contentHash && localState.contentHash === action.contentHash;

      if (canSkip) {
        let skipAllowed = true;
        const currentPath = localState.path;
        if (currentPath !== action.path) {
          const fromAbs = Paths.join(vaultPath, currentPath);
          const toAbs = Paths.join(vaultPath, action.path);
          const fromFile = new File(fromAbs);
          if (fromFile.exists) {
            const parentDir = new Directory(Paths.dirname(toAbs));
            if (!parentDir.exists) {
              parentDir.create({ intermediates: true });
            }
            try {
              fromFile.move(new File(toAbs));
            } catch {
              skipAllowed = false;
            }
          } else {
            // 本地文件缺失，回退到下载
            skipAllowed = false;
          }
        }

        if (skipAllowed) {
          const remoteClock = action.remoteVectorClock ?? createEmptyClock();
          const localEntry = getEntry(vaultPath, action.fileId);
          const mergedClock = localEntry
            ? mergeVectorClocks(localEntry.vectorClock, remoteClock)
            : remoteClock;
          completed.push({
            fileId: action.fileId,
            action: 'download',
            path: action.path,
            title: extractTitle(action.path),
            size: localState.size,
            contentHash: localState.contentHash,
            vectorClock: mergedClock,
          });

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
      }

      if (localState && localState.path !== action.path) {
        const fromAbs = Paths.join(vaultPath, localState.path);
        const fromFile = new File(fromAbs);
        if (fromFile.exists) {
          try {
            fromFile.delete();
          } catch {
            // 旧文件删除失败则继续，避免阻塞下载
          }
        }
      }

      // 确保目录存在
      const parentPath = Paths.dirname(absolutePath);
      const parentDir = new Directory(parentPath);
      if (!parentDir.exists) {
        parentDir.create({ intermediates: true });
      }

      const content = await cloudSyncApi.downloadFile(action.url);
      const file = new File(absolutePath);
      file.write(content);
      const fileInfo = readFileInfo(file);

      const hash = action.contentHash ?? (await computeHash(content));
      const encoder = new TextEncoder();
      const size = fileInfo.size || encoder.encode(content).length;
      completed.push({
        fileId: action.fileId,
        action: 'download',
        path: action.path,
        title: extractTitle(action.path),
        size,
        contentHash: hash,
        vectorClock: action.remoteVectorClock ?? createEmptyClock(),
      });

      downloadedEntries.push({
        fileId: action.fileId,
        path: action.path,
        vectorClock: action.remoteVectorClock ?? createEmptyClock(),
        contentHash: hash,
        size,
        mtime: fileInfo.mtime,
      });
      break;
    }

    case 'delete': {
      const file = new File(absolutePath);
      if (file.exists) {
        file.delete();
      }
      deleted.push(action.fileId);
      break;
    }

    case 'conflict': {
      if (!action.conflictRename || !action.url || !action.uploadUrl) {
        throw new Error('Invalid conflict action: missing conflict metadata');
      }
      if (!action.conflictCopyId || !action.conflictCopyUploadUrl) {
        throw new Error('Invalid conflict action: missing conflict copy info');
      }

      // 冲突策略：以本地为准
      // 1. 下载云端版本保存为冲突副本
      // 2. 上传本地版本覆盖云端

      const conflictAbsPath = Paths.join(vaultPath, action.conflictRename);

      // 确保目录存在
      const conflictParentPath = Paths.dirname(conflictAbsPath);
      const conflictParentDir = new Directory(conflictParentPath);
      if (!conflictParentDir.exists) {
        conflictParentDir.create({ intermediates: true });
      }

      // 1. 下载云端版本保存为冲突副本
      const remoteContent = await cloudSyncApi.downloadFile(action.url);
      new File(conflictAbsPath).write(remoteContent);

      // 2. 读取本地文件
      const localFile = new File(absolutePath);
      const localContent = localFile.textSync();
      const encoder = new TextEncoder();
      const localBytes = encoder.encode(localContent);
      const localState = localStates.get(action.fileId);
      const localInfo = readFileInfo(localFile);
      const localSize = localState?.size ?? localBytes.length;
      const localMtime = localState?.mtime ?? localInfo.mtime ?? null;

      const localHash = await computeHash(localContent);
      const remoteHash = action.contentHash ?? (await computeHash(remoteContent));
      const remoteBytes = encoder.encode(remoteContent);
      const conflictInfo = readFileInfo(new File(conflictAbsPath));
      const remoteClock = action.remoteVectorClock ?? createEmptyClock();
      const conflictCopySize = conflictInfo.size;
      const conflictCopyMtime = conflictInfo.mtime;

      // 3. 先上传冲突副本，确保远端版本被保留
      await cloudSyncApi.uploadFile(action.conflictCopyUploadUrl, remoteBytes);

      const existingConflictCopy = getEntry(vaultPath, action.conflictCopyId);
      if (existingConflictCopy) {
        updateEntry(vaultPath, action.conflictCopyId, {
          path: action.conflictRename,
          vectorClock: remoteClock,
          lastSyncedHash: remoteHash,
          lastSyncedClock: remoteClock,
          lastSyncedSize: conflictCopySize,
          lastSyncedMtime: conflictCopyMtime,
        });
      } else {
        addEntry(vaultPath, {
          id: action.conflictCopyId,
          path: action.conflictRename,
          createdAt: Date.now(),
          vectorClock: remoteClock,
          lastSyncedHash: remoteHash,
          lastSyncedClock: remoteClock,
          lastSyncedSize: conflictCopySize,
          lastSyncedMtime: conflictCopyMtime,
        });
      }
      await saveFileIndex(vaultPath);

      // 4. 上传本地版本覆盖云端
      await cloudSyncApi.uploadFile(action.uploadUrl, localBytes);

      // 合并本地和远端的向量时钟
      const pending = pendingChanges.get(action.fileId);
      const localClock = pending?.vectorClock ?? getVectorClock(vaultPath, action.fileId);
      const mergedClock = mergeVectorClocks(localClock, remoteClock);
      const finalClock = incrementClock(mergedClock, deviceId);

      completed.push({
        fileId: action.fileId,
        action: 'conflict',
        path: action.path,
        title: extractTitle(action.path),
        size: localBytes.length,
        contentHash: localHash,
        vectorClock: finalClock,
        expectedHash: action.contentHash,
      });

      completed.push({
        fileId: action.conflictCopyId,
        action: 'upload',
        path: action.conflictRename,
        title: extractTitle(action.conflictRename),
        size: remoteBytes.length,
        contentHash: remoteHash,
        vectorClock: remoteClock,
      });

      conflictEntries.push({
        originalFileId: action.fileId,
        originalPath: action.path,
        mergedClock: finalClock,
        contentHash: localHash,
        originalSize: localSize,
        originalMtime: localMtime,
        conflictCopyId: action.conflictCopyId,
        conflictCopyPath: action.conflictRename,
        conflictCopyClock: remoteClock,
        conflictCopyHash: remoteHash,
        conflictCopySize: conflictCopySize,
        conflictCopyMtime: conflictCopyMtime,
      });
      break;
    }
  }
};

// ── 批量执行同步操作 ────────────────────────────────────────

export interface ExecuteResult {
  completed: CompletedFileDto[];
  deleted: string[];
  downloadedEntries: DownloadedEntry[];
  conflictEntries: ConflictEntry[];
  errors: Array<{ action: SyncActionDto; error: Error }>;
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

/** 批量执行同步操作，收集结果 */
export const executeActions = async (
  actions: SyncActionDto[],
  vaultPath: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  localStates: Map<string, LocalFileState>
): Promise<ExecuteResult> => {
  const completed: CompletedFileDto[] = [];
  const deleted: string[] = [];
  const downloadedEntries: DownloadedEntry[] = [];
  const conflictEntries: ConflictEntry[] = [];
  const errors: Array<{ action: SyncActionDto; error: Error }> = [];

  for (const action of actions) {
    try {
      await executeAction(
        action,
        vaultPath,
        deviceId,
        pendingChanges,
        localStates,
        completed,
        deleted,
        downloadedEntries,
        conflictEntries
      );
    } catch (e) {
      errors.push({
        action,
        error: e instanceof Error ? e : new Error(String(e)),
      });
      console.error('[CloudSync] Execute action failed:', action.action, action.path, e);
    }
  }

  return { completed, deleted, downloadedEntries, conflictEntries, errors };
};

// ── 应用变更到 FileIndex（成功后）────────────────────────────

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

  for (const fileId of executeResult.deleted) {
    removeEntry(vaultPath, fileId);
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
