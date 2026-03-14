/**
 * [INPUT]: SyncActionDto[], vaultPath, profileKey, deviceId, pendingChanges, localStates
 * [OUTPUT]: ExecuteResult（receipts/staged file info/errors）+ 提交后 Sync Mirror 变更
 * [POS]: PC 云同步执行器，负责本地变更检测与同步动作执行（提交时保证时钟不回退）
 *
 * 核心原则：状态变更只在 commit 成功后执行
 * - detectLocalChanges: 只读，支持 mtime/size 预过滤以减少哈希
 * - executeActions: 只做 I/O，不修改 Sync Mirror
 * - applyChangesToSyncMirror: commit 成功后调用，修改 Sync Mirror
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { readFile, writeFile, stat, mkdir, unlink, rename } from 'node:fs/promises';
import { fetchRaw } from '@moryflow/api/client';
import { normalizeSyncPath, type VectorClock } from '@moryflow/sync';
import type { SyncActionDto, SyncActionReceiptDto, LocalFileDto } from '../api/types.js';
import type { SyncDirection } from '../const.js';
import { createStagingFilePath } from '../apply-journal.js';
import {
  incrementClock,
  mergeClocks,
} from '../sync-mirror-clocks.js';
import {
  getAllSyncMirrorEntries,
  getSyncMirrorEntry,
  loadSyncMirror,
  mutateSyncMirror,
} from '../sync-mirror-state.js';
import { workspaceDocRegistry } from '../../workspace-doc-registry/index.js';
import { activityTracker } from './activity-tracker.js';
import { createLogger } from '../logger.js';

const log = createLogger('executor');

// ── 常量 ────────────────────────────────────────────────────

/** 网络请求超时时间 (ms) */
const FETCH_TIMEOUT = 30000;
const HASH_CACHE_LIMIT = 2000;

// ── 网络请求工具 ────────────────────────────────────────────

/** 带超时控制的 fetch */
const fetchWithTimeout = async (
  url: string,
  options?: RequestInit,
  timeout: number = FETCH_TIMEOUT
): Promise<Response> => {
  return fetchRaw(url, {
    ...options,
    timeoutMs: timeout,
  });
};

// ── 工具函数 ────────────────────────────────────────────────

/** 计算文件内容的 SHA256 哈希 */
export const computeHash = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
};

/** 计算 Buffer 内容的 SHA256 哈希 */
export const computeBufferHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// ── 哈希缓存（避免重复读取）──────────────────────────────────

interface HashCacheEntry {
  size: number;
  mtime: number;
  hash: string;
}

const hashCache = new Map<string, HashCacheEntry>();

const buildCacheKey = (vaultPath: string, fileId: string): string => `${vaultPath}:${fileId}`;

const resolveSafePath = (vaultPath: string, relativePath: string): string => {
  const root = path.resolve(vaultPath);
  const target = path.resolve(root, relativePath);
  if (target === root || !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to access path outside vault: ${relativePath}`);
  }
  return target;
};

const getCachedHash = (key: string, size: number, mtime: number): string | null => {
  const cached = hashCache.get(key);
  if (!cached) return null;
  if (cached.size !== size || cached.mtime !== mtime) return null;
  return cached.hash;
};

const setCachedHash = (key: string, size: number, mtime: number, hash: string): void => {
  if (hashCache.size >= HASH_CACHE_LIMIT) {
    hashCache.clear();
  }
  hashCache.set(key, { size, mtime, hash });
};

export const resetHashCache = (): void => {
  hashCache.clear();
};

/** 获取相对路径 */
export const getRelativePath = (vaultPath: string, absolutePath: string): string =>
  normalizeSyncPath(path.relative(vaultPath, absolutePath));

/** 判断是否为 Markdown 文件（支持 .md 和 .markdown） */
export const isMarkdownFile = (filePath: string): boolean => {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
};

/** 从文件路径提取标题（文件名不含扩展名） */
const extractTitle = (filePath: string): string => path.basename(filePath, path.extname(filePath));

// ── 待提交的状态变更 ────────────────────────────────────────

/** 待提交的状态变更（暂存，不立即应用） */
export interface PendingChange {
  type: 'new' | 'modified' | 'deleted';
  fileId: string;
  path: string;
  vectorClock: VectorClock;
  contentHash: string;
  expectedHash?: string;
}

/** 检测本地变更的结果 */
export interface DetectChangesResult {
  dtos: LocalFileDto[];
  pendingChanges: Map<string, PendingChange>;
  localStates: Map<string, LocalFileState>;
}

export interface LocalFileState {
  fileId: string;
  path: string;
  contentHash: string;
  size: number;
  mtime: number;
}

// ── 检测本地变更（只读）────────────────────────────────────

/**
 * 检测本地变更
 * 重要：此函数是只读的，不修改 FileIndex
 */
export const detectLocalChanges = async (
  vaultPath: string,
  profileKey: string,
  deviceId: string
): Promise<DetectChangesResult> => {
  await loadSyncMirror(vaultPath, profileKey);
  const registryEntries = await workspaceDocRegistry.getAll(vaultPath);
  const mirrorEntries = new Map(
    getAllSyncMirrorEntries(vaultPath, profileKey).map((entry) => [entry.documentId, entry])
  );
  const dtos: LocalFileDto[] = [];
  const pendingChanges = new Map<string, PendingChange>();
  const localStates = new Map<string, LocalFileState>();

  // 1. 处理当前存在的文件
  for (const documentEntry of registryEntries) {
    const entry =
      mirrorEntries.get(documentEntry.documentId) ??
      ({
        documentId: documentEntry.documentId,
        path: documentEntry.path,
        createdAt: Date.now(),
        vectorClock: {},
        lastSyncedHash: null,
        lastSyncedClock: {},
        lastSyncedSize: null,
        lastSyncedMtime: null,
      } as const);
    const currentPath = documentEntry.path;
    const pathChanged = entry.path !== currentPath;
    let absolutePath: string;
    try {
      absolutePath = resolveSafePath(vaultPath, currentPath);
    } catch (error) {
      log.warn('skip unsafe document registry path:', currentPath, error);
      continue;
    }
    const cacheKey = buildCacheKey(vaultPath, documentEntry.documentId);

    try {
      const stats = await stat(absolutePath);
      if (!stats.isFile()) continue;

      const cachedHash = getCachedHash(cacheKey, stats.size, stats.mtimeMs);
      const canReuseHash =
        entry.lastSyncedHash !== null &&
        typeof entry.lastSyncedSize === 'number' &&
        typeof entry.lastSyncedMtime === 'number' &&
        entry.lastSyncedSize === stats.size &&
        entry.lastSyncedMtime === stats.mtimeMs;

      const currentHash = canReuseHash
        ? (entry.lastSyncedHash as string)
        : (cachedHash ?? (await computeHash(absolutePath)));

      if (canReuseHash) {
        setCachedHash(cacheKey, stats.size, stats.mtimeMs, currentHash);
      } else if (!cachedHash) {
        setCachedHash(cacheKey, stats.size, stats.mtimeMs, currentHash);
      }

      // 比较内容哈希检测变更
      const hasChanged = pathChanged || currentHash !== entry.lastSyncedHash;
      const clockToSend = hasChanged
        ? incrementClock(entry.vectorClock, deviceId)
        : entry.vectorClock;

      dtos.push({
        fileId: documentEntry.documentId,
        path: currentPath,
        title: extractTitle(currentPath),
        size: stats.size,
        contentHash: currentHash,
        vectorClock: clockToSend,
      });

      localStates.set(documentEntry.documentId, {
        fileId: documentEntry.documentId,
        path: currentPath,
        contentHash: currentHash,
        size: stats.size,
        mtime: stats.mtimeMs,
      });

      if (hasChanged) {
        pendingChanges.set(documentEntry.documentId, {
          type: entry.lastSyncedHash === null ? 'new' : 'modified',
          fileId: documentEntry.documentId,
          path: currentPath,
          vectorClock: clockToSend,
          contentHash: currentHash,
          expectedHash: entry.lastSyncedHash ?? undefined,
        });
      }
    } catch {
      hashCache.delete(cacheKey);
      // 文件不存在（已删除）
      // 只有同步过的文件才需要通知服务端删除
      if (entry.lastSyncedHash !== null) {
        const deleteClock = incrementClock(entry.vectorClock, deviceId);

        dtos.push({
          fileId: documentEntry.documentId,
          path: entry.path,
          title: extractTitle(entry.path),
          size: 0,
          contentHash: '', // 空 hash 表示删除
          vectorClock: deleteClock,
        });

        pendingChanges.set(documentEntry.documentId, {
          type: 'deleted',
          fileId: documentEntry.documentId,
          path: entry.path,
          vectorClock: deleteClock,
          contentHash: '',
          expectedHash: entry.lastSyncedHash ?? undefined,
        });
      }
    }
  }

  return { dtos, pendingChanges, localStates };
};

// ── 执行结果类型 ────────────────────────────────────────────

/** 下载的文件信息（用于后续更新 FileIndex） */
export interface DownloadedEntry {
  fileId: string;
  path: string;
  vectorClock: VectorClock;
  contentHash: string;
  size: number;
  mtime: number;
  storageRevision: string | null;
}

/** 冲突处理信息（用于后续更新 FileIndex） */
export interface ConflictEntry {
  originalFileId: string;
  originalPath: string;
  mergedClock: VectorClock;
  contentHash: string;
  originalSize: number;
  originalMtime: number;
  originalStorageRevision: string | null;
  conflictCopyId: string;
  conflictCopyPath: string;
  conflictCopyClock: VectorClock;
  conflictCopyHash: string;
  conflictCopySize: number;
  conflictCopyMtime: number;
  conflictCopyStorageRevision: string | null;
}

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

export interface DeletedEntry {
  fileId: string;
  expectedHash?: string;
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

// ── 执行单个同步操作 ────────────────────────────────────────

export const executeAction = async (
  action: SyncActionDto,
  vaultPath: string,
  profileKey: string,
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
      const content = await readFile(absolutePath);
      const hash = computeBufferHash(content);
      if (action.contentHash && hash !== action.contentHash) {
        throw new Error('upload contract mismatch: content hash changed after diff');
      }
      if (typeof action.size === 'number' && content.length !== action.size) {
        throw new Error('upload contract mismatch: file size changed after diff');
      }
      const res = await fetchWithTimeout(action.url, {
        method: 'PUT',
        body: new Uint8Array(content),
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!res.ok) {
        throw new Error(`上传失败: ${res.status} ${res.statusText}`);
      }
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
        const skipAllowed = true;
        const currentPath = localState.path;
        if (currentPath !== action.path) {
          stagedOperations.push({
            type: 'rename_file',
            fileId: action.fileId,
            sourcePath: currentPath,
            targetPath: action.path,
          });
        }

        if (skipAllowed) {
          const remoteClock = action.remoteVectorClock ?? {};
          const localEntry = getSyncMirrorEntry(vaultPath, profileKey, action.fileId);
          const mergedClock = localEntry
            ? mergeClocks(localEntry.vectorClock, remoteClock)
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
            storageRevision: action.remoteStorageRevision ?? action.storageRevision ?? null,
          });
          break;
        }
      }

      const res = await fetchWithTimeout(action.url);
      if (!res.ok) {
        throw new Error(`下载失败: ${res.status} ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const actualHash = computeBufferHash(buffer);
      if (action.contentHash && actualHash !== action.contentHash) {
        throw new Error('download contract mismatch: remote content hash changed');
      }
      if (typeof action.size === 'number' && buffer.length !== action.size) {
        throw new Error('download contract mismatch: remote file size changed');
      }
      const tempFilePath = await createStagingFilePath(
        vaultPath,
        profileKey,
        journalId,
        action.actionId,
        action.path
      );
      await writeFile(tempFilePath, buffer);

      const hash = actualHash;
      const remoteClock = action.remoteVectorClock ?? {};

      const downloadedAt = Date.now();

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

      // 记录下载信息，用于后续更新 FileIndex
      downloadedEntries.push({
        fileId: action.fileId,
        path: action.path,
        vectorClock: remoteClock,
        contentHash: hash,
        size: buffer.length,
        mtime: downloadedAt,
        storageRevision: action.remoteStorageRevision ?? action.storageRevision ?? null,
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
      if (!action.conflictRename || !action.url || !action.uploadUrl) return;
      // 使用服务端生成的冲突副本 ID
      if (!action.conflictCopyId) return;

      // 1. 下载云端版本保存为冲突副本
      const downloadRes = await fetchWithTimeout(action.url);
      if (!downloadRes.ok) {
        throw new Error(`下载冲突版本失败: ${downloadRes.status} ${downloadRes.statusText}`);
      }
      const remoteBuffer = Buffer.from(await downloadRes.arrayBuffer());
      const remoteHash = computeBufferHash(remoteBuffer);
      if (action.contentHash && remoteHash !== action.contentHash) {
        throw new Error('conflict download contract mismatch: remote content hash changed');
      }
      if (typeof action.size === 'number' && remoteBuffer.length !== action.size) {
        throw new Error('conflict download contract mismatch: remote file size changed');
      }
      const conflictTempFilePath = await createStagingFilePath(
        vaultPath,
        profileKey,
        journalId,
        `${action.actionId}-conflict-copy`,
        action.conflictRename
      );
      await writeFile(conflictTempFilePath, remoteBuffer);

      // 2. 上传冲突副本到 R2（如果有 URL）
      if (action.conflictCopyUploadUrl) {
        const copyUploadRes = await fetchWithTimeout(action.conflictCopyUploadUrl, {
          method: 'PUT',
          body: new Uint8Array(remoteBuffer),
          headers: { 'Content-Type': 'application/octet-stream' },
        });
        if (!copyUploadRes.ok) {
          throw new Error(`上传冲突副本失败: ${copyUploadRes.status} ${copyUploadRes.statusText}`);
        }
        if (action.conflictCopyStorageRevision) {
          uploadedObjects.push({
            fileId: action.conflictCopyId,
            storageRevision: action.conflictCopyStorageRevision,
            contentHash: remoteHash,
          });
        }
      }

      // 3. 读取本地文件并上传覆盖云端原始文件
      const localContent = await readFile(absolutePath);
      const localHash = computeBufferHash(localContent);
      if (action.uploadContentHash && localHash !== action.uploadContentHash) {
        throw new Error('conflict upload contract mismatch: local content changed after diff');
      }
      if (typeof action.uploadSize === 'number' && localContent.length !== action.uploadSize) {
        throw new Error('conflict upload contract mismatch: local size changed after diff');
      }
      const uploadRes = await fetchWithTimeout(action.uploadUrl, {
        method: 'PUT',
        body: new Uint8Array(localContent),
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!uploadRes.ok) {
        throw new Error(`上传本地版本失败: ${uploadRes.status} ${uploadRes.statusText}`);
      }
      if (action.storageRevision) {
        uploadedObjects.push({
          fileId: action.fileId,
          storageRevision: action.storageRevision,
          contentHash: localHash,
        });
      }

      const remoteClock = action.remoteVectorClock ?? {};
      const localState = localStates.get(action.fileId);
      const originalSize = localState?.size ?? localContent.length;
      const originalMtime = localState?.mtime ?? Date.now();
      const conflictCopySize = remoteBuffer.length;
      const conflictCopyMtime = Date.now();

      // 获取本地 pending 时钟
      const pending = pendingChanges.get(action.fileId);
      const localClock = pending?.vectorClock ?? {};

      // 合并时钟并递增
      const mergedClock = mergeClocks(localClock, remoteClock);
      const finalClock = incrementClock(mergedClock, deviceId);

      // 4. 原始文件（本地版本覆盖云端）
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

      // 记录冲突信息，用于后续更新 FileIndex
      conflictEntries.push({
        originalFileId: action.fileId,
        originalPath: action.path,
        mergedClock: finalClock,
        contentHash: localHash,
        originalSize,
        originalMtime,
        originalStorageRevision: action.storageRevision ?? null,
        conflictCopyId: action.conflictCopyId,
        conflictCopyPath: action.conflictRename,
        conflictCopyClock: remoteClock,
        conflictCopyHash: remoteHash,
        conflictCopySize,
        conflictCopyMtime,
        conflictCopyStorageRevision: action.conflictCopyStorageRevision ?? null,
      });
      break;
    }
  }
};

// ── 批量执行同步操作 ────────────────────────────────────────

/** 批量执行同步操作，收集结果 */
export const executeActions = async (
  actions: SyncActionDto[],
  vaultPath: string,
  profileKey: string,
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
        profileKey,
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
    } catch (e) {
      errors.push({
        action,
        error: e instanceof Error ? e : new Error(String(e)),
      });
      log.error('execute action failed:', action.action, action.path, e);
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

// ── 工具函数：action 类型转换为 direction ────────────────────

const actionToDirection = (action: SyncActionDto['action']): SyncDirection => {
  switch (action) {
    case 'upload':
      return 'upload';
    case 'download':
      return 'download';
    case 'delete':
      return 'delete';
    case 'conflict':
      return 'download'; // 冲突处理视为下载新版本
  }
};

/** 带活动追踪的批量执行同步操作 */
export const executeActionsWithTracking = async (
  actions: SyncActionDto[],
  vaultPath: string,
  profileKey: string,
  journalId: string,
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  localStates: Map<string, LocalFileState>,
  onProgress?: () => void
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
    const direction = actionToDirection(action.action);

    // 开始当前文件的同步活动
    activityTracker.startActivity(action.fileId, action.path, direction, action.size);

    // 通知 UI 更新
    onProgress?.();

    try {
      await executeAction(
        action,
        vaultPath,
        profileKey,
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

      // 完成当前活动
      activityTracker.completeActivity(action.size);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      errors.push({ action, error });

      // 标记活动失败
      activityTracker.failActivity(error.message);

      log.error('execute action failed:', action.action, action.path, e);
    }

    // 每个操作完成后通知 UI 更新
    onProgress?.();
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

// ── 应用变更到 FileIndex（成功后）────────────────────────────

/**
 * 同步成功后更新本地索引
 * 重要：只有在 commit 成功后才调用此函数
 */
export const applyChangesToSyncMirror = async (
  vaultPath: string,
  profileKey: string,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>,
  localStates: Map<string, LocalFileState>
): Promise<void> => {
  const uploadedObjectMap = new Map(
    executeResult.uploadedObjects.map((entry) => [entry.fileId, entry.storageRevision])
  );
  await mutateSyncMirror(vaultPath, profileKey, (mirror) => {
    // 1. 应用本地变更（new/modified/deleted）
    for (const [fileId, change] of pendingChanges) {
      if (!completedIds.has(fileId)) continue;

      switch (change.type) {
        case 'new':
        case 'modified': {
          const localState = localStates.get(fileId);
          const existing = mirror.get(fileId);
          mirror.ensure(fileId, change.path);
          mirror.update(fileId, {
            path: change.path,
            vectorClock: change.vectorClock,
            lastSyncedHash: change.contentHash,
            lastSyncedClock: change.vectorClock,
            lastSyncedSize: localState?.size ?? null,
            lastSyncedMtime: localState?.mtime ?? null,
            lastSyncedStorageRevision:
              uploadedObjectMap.get(fileId) ??
              existing?.lastSyncedStorageRevision ??
              null,
          });
          break;
        }

        case 'deleted': {
          mirror.delete(fileId);
          break;
        }
      }
    }

    // 2. 应用下载的文件
    for (const entry of executeResult.downloadedEntries) {
      mirror.ensure(entry.fileId, entry.path);
      mirror.update(entry.fileId, {
        path: entry.path,
        vectorClock: entry.vectorClock,
        lastSyncedHash: entry.contentHash,
        lastSyncedClock: entry.vectorClock,
        lastSyncedSize: entry.size,
        lastSyncedMtime: entry.mtime,
        lastSyncedStorageRevision: entry.storageRevision,
      });
    }

    // 3. 应用删除的文件
    for (const deleted of executeResult.deleted) {
      mirror.delete(deleted.fileId);
    }

    // 4. 应用冲突处理
    for (const conflict of executeResult.conflictEntries) {
      mirror.ensure(conflict.originalFileId, conflict.originalPath);
      mirror.update(conflict.originalFileId, {
        path: conflict.originalPath,
        vectorClock: conflict.mergedClock,
        lastSyncedHash: conflict.contentHash,
        lastSyncedClock: conflict.mergedClock,
        lastSyncedSize: conflict.originalSize,
        lastSyncedMtime: conflict.originalMtime,
        lastSyncedStorageRevision: conflict.originalStorageRevision,
      });

      mirror.ensure(conflict.conflictCopyId, conflict.conflictCopyPath);
      mirror.update(conflict.conflictCopyId, {
        path: conflict.conflictCopyPath,
        vectorClock: conflict.conflictCopyClock,
        lastSyncedHash: conflict.conflictCopyHash,
        lastSyncedClock: conflict.conflictCopyClock,
        lastSyncedSize: conflict.conflictCopySize,
        lastSyncedMtime: conflict.conflictCopyMtime,
        lastSyncedStorageRevision: conflict.conflictCopyStorageRevision,
      });
    }
  });
};
