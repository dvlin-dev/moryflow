/**
 * [INPUT]: SyncActionDto[], vaultPath, deviceId, pendingChanges, localStates
 * [OUTPUT]: ExecuteResult（completed/deleted/errors）+ 提交后 FileIndex 变更
 * [POS]: PC 云同步执行器，负责本地变更检测与同步动作执行（提交时保证时钟不回退）
 *
 * 核心原则：状态变更只在 commit 成功后执行
 * - detectLocalChanges: 只读，支持 mtime/size 预过滤以减少哈希
 * - executeActions: 只做 I/O，不修改 FileIndex
 * - applyChangesToFileIndex: commit 成功后调用，修改 FileIndex
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { readFile, writeFile, stat, mkdir, unlink, rename } from 'node:fs/promises';
import type { VectorClock } from '@anyhunt/sync';
import type { SyncActionDto, CompletedFileDto, LocalFileDto } from '../api/types.js';
import type { SyncDirection } from '../const.js';
import {
  fileIndexManager,
  incrementClock,
  mergeClocks,
  getEntry,
  updateEntry,
  addEntry,
  removeEntry,
  saveFileIndex,
} from '../file-index/index.js';
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
  path.relative(vaultPath, absolutePath);

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
  deviceId: string
): Promise<DetectChangesResult> => {
  const entries = fileIndexManager.getAll(vaultPath);
  const dtos: LocalFileDto[] = [];
  const pendingChanges = new Map<string, PendingChange>();
  const localStates = new Map<string, LocalFileState>();

  // 1. 处理当前存在的文件
  for (const entry of entries) {
    const absolutePath = path.join(vaultPath, entry.path);
    const cacheKey = buildCacheKey(vaultPath, entry.id);

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
      const hasChanged = currentHash !== entry.lastSyncedHash;
      const clockToSend = hasChanged
        ? incrementClock(entry.vectorClock, deviceId)
        : entry.vectorClock;

      dtos.push({
        fileId: entry.id,
        path: entry.path,
        title: extractTitle(entry.path),
        size: stats.size,
        contentHash: currentHash,
        vectorClock: clockToSend,
      });

      localStates.set(entry.id, {
        fileId: entry.id,
        path: entry.path,
        contentHash: currentHash,
        size: stats.size,
        mtime: stats.mtimeMs,
      });

      if (hasChanged) {
        pendingChanges.set(entry.id, {
          type: entry.lastSyncedHash === null ? 'new' : 'modified',
          fileId: entry.id,
          path: entry.path,
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
          fileId: entry.id,
          path: entry.path,
          title: extractTitle(entry.path),
          size: 0,
          contentHash: '', // 空 hash 表示删除
          vectorClock: deleteClock,
        });

        pendingChanges.set(entry.id, {
          type: 'deleted',
          fileId: entry.id,
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
}

/** 冲突处理信息（用于后续更新 FileIndex） */
export interface ConflictEntry {
  originalFileId: string;
  originalPath: string;
  mergedClock: VectorClock;
  contentHash: string;
  originalSize: number;
  originalMtime: number;
  conflictCopyId: string;
  conflictCopyPath: string;
  conflictCopyClock: VectorClock;
  conflictCopyHash: string;
  conflictCopySize: number;
  conflictCopyMtime: number;
}

export interface ExecuteResult {
  completed: CompletedFileDto[];
  deleted: string[];
  downloadedEntries: DownloadedEntry[];
  conflictEntries: ConflictEntry[];
  errors: Array<{ action: SyncActionDto; error: Error }>;
}

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
  const absolutePath = path.join(vaultPath, action.path);

  switch (action.action) {
    case 'upload': {
      if (!action.url) return;
      const content = await readFile(absolutePath);
      const res = await fetchWithTimeout(action.url, {
        method: 'PUT',
        body: new Uint8Array(content),
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!res.ok) {
        throw new Error(`上传失败: ${res.status} ${res.statusText}`);
      }
      const hash = computeBufferHash(content);
      const pending = pendingChanges.get(action.fileId);
      const localEntry = getEntry(vaultPath, action.fileId);
      const fallbackClock = localEntry?.vectorClock ?? {};
      completed.push({
        fileId: action.fileId,
        action: 'upload',
        path: action.path,
        title: extractTitle(action.path),
        size: content.length,
        contentHash: hash,
        vectorClock: pending?.vectorClock ?? fallbackClock,
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
          const fromAbsPath = path.join(vaultPath, currentPath);
          const toAbsPath = path.join(vaultPath, action.path);
          try {
            await mkdir(path.dirname(toAbsPath), { recursive: true });
            await rename(fromAbsPath, toAbsPath);
          } catch {
            skipAllowed = false;
          }
        }

        if (skipAllowed) {
          const remoteClock = action.remoteVectorClock ?? {};
          const localEntry = getEntry(vaultPath, action.fileId);
          const mergedClock = localEntry
            ? mergeClocks(localEntry.vectorClock, remoteClock)
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

      // 检查是否是路径变更（文件重命名从远端同步到本地）
      const existingPath = fileIndexManager.getByFileId(vaultPath, action.fileId);
      if (existingPath && existingPath !== action.path) {
        // 删除旧路径的文件
        const oldAbsPath = path.join(vaultPath, existingPath);
        try {
          await unlink(oldAbsPath);
        } catch {
          // 文件可能已不存在
        }
      }

      // 确保目录存在
      await mkdir(path.dirname(absolutePath), { recursive: true });
      const res = await fetchWithTimeout(action.url);
      if (!res.ok) {
        throw new Error(`下载失败: ${res.status} ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(absolutePath, buffer);

      const hash = action.contentHash ?? computeBufferHash(buffer);
      const remoteClock = action.remoteVectorClock ?? {};

      const downloadedAt = Date.now();

      completed.push({
        fileId: action.fileId,
        action: 'download',
        path: action.path,
        title: extractTitle(action.path),
        size: buffer.length,
        contentHash: hash,
        vectorClock: remoteClock,
      });

      // 记录下载信息，用于后续更新 FileIndex
      downloadedEntries.push({
        fileId: action.fileId,
        path: action.path,
        vectorClock: remoteClock,
        contentHash: hash,
        size: buffer.length,
        mtime: downloadedAt,
      });
      break;
    }

    case 'delete': {
      try {
        await unlink(absolutePath);
      } catch {
        // 文件可能已不存在
      }
      deleted.push(action.fileId);
      break;
    }

    case 'conflict': {
      if (!action.conflictRename || !action.url || !action.uploadUrl) return;
      // 使用服务端生成的冲突副本 ID
      if (!action.conflictCopyId) return;

      const conflictAbsPath = path.join(vaultPath, action.conflictRename);
      await mkdir(path.dirname(conflictAbsPath), { recursive: true });

      // 1. 下载云端版本保存为冲突副本
      const downloadRes = await fetchWithTimeout(action.url);
      if (!downloadRes.ok) {
        throw new Error(`下载冲突版本失败: ${downloadRes.status} ${downloadRes.statusText}`);
      }
      const remoteBuffer = Buffer.from(await downloadRes.arrayBuffer());
      await writeFile(conflictAbsPath, remoteBuffer);

      // 2. 上传冲突副本到 R2（如果有 URL）
      const remoteHash = action.contentHash ?? computeBufferHash(remoteBuffer);
      if (action.conflictCopyUploadUrl) {
        const copyUploadRes = await fetchWithTimeout(action.conflictCopyUploadUrl, {
          method: 'PUT',
          body: new Uint8Array(remoteBuffer),
          headers: { 'Content-Type': 'application/octet-stream' },
        });
        if (!copyUploadRes.ok) {
          throw new Error(`上传冲突副本失败: ${copyUploadRes.status} ${copyUploadRes.statusText}`);
        }
      }

      // 3. 读取本地文件并上传覆盖云端原始文件
      const localContent = await readFile(absolutePath);
      const uploadRes = await fetchWithTimeout(action.uploadUrl, {
        method: 'PUT',
        body: new Uint8Array(localContent),
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!uploadRes.ok) {
        throw new Error(`上传本地版本失败: ${uploadRes.status} ${uploadRes.statusText}`);
      }

      const localHash = computeBufferHash(localContent);
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
      completed.push({
        fileId: action.fileId,
        action: 'conflict',
        path: action.path,
        title: extractTitle(action.path),
        size: localContent.length,
        contentHash: localHash,
        vectorClock: finalClock,
        expectedHash: action.contentHash,
      });

      // 5. 冲突副本（云端版本保存为新文件）
      completed.push({
        fileId: action.conflictCopyId,
        action: 'upload', // 冲突副本作为新上传处理
        path: action.conflictRename,
        title: extractTitle(action.conflictRename),
        size: remoteBuffer.length,
        contentHash: remoteHash,
        vectorClock: remoteClock, // 使用远端时钟
      });

      // 记录冲突信息，用于后续更新 FileIndex
      conflictEntries.push({
        originalFileId: action.fileId,
        originalPath: action.path,
        mergedClock: finalClock,
        contentHash: localHash,
        originalSize,
        originalMtime,
        conflictCopyId: action.conflictCopyId,
        conflictCopyPath: action.conflictRename,
        conflictCopyClock: remoteClock,
        conflictCopyHash: remoteHash,
        conflictCopySize,
        conflictCopyMtime,
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
      log.error('execute action failed:', action.action, action.path, e);
    }
  }

  return { completed, deleted, downloadedEntries, conflictEntries, errors };
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
  deviceId: string,
  pendingChanges: Map<string, PendingChange>,
  localStates: Map<string, LocalFileState>,
  onProgress?: () => void
): Promise<ExecuteResult> => {
  const completed: CompletedFileDto[] = [];
  const deleted: string[] = [];
  const downloadedEntries: DownloadedEntry[] = [];
  const conflictEntries: ConflictEntry[] = [];
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
        deviceId,
        pendingChanges,
        localStates,
        completed,
        deleted,
        downloadedEntries,
        conflictEntries
      );

      // 完成当前活动
      const completedItem = completed.find((c) => c.fileId === action.fileId);
      activityTracker.completeActivity(completedItem?.size);
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

  return { completed, deleted, downloadedEntries, conflictEntries, errors };
};

// ── 应用变更到 FileIndex（成功后）────────────────────────────

/**
 * 同步成功后更新本地索引
 * 重要：只有在 commit 成功后才调用此函数
 */
export const applyChangesToFileIndex = async (
  vaultPath: string,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>,
  localStates: Map<string, LocalFileState>
): Promise<void> => {
  // 1. 应用本地变更（new/modified/deleted）
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

  // 2. 应用下载的文件
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

  // 3. 应用删除的文件
  for (const fileId of executeResult.deleted) {
    removeEntry(vaultPath, fileId);
  }

  // 4. 应用冲突处理
  for (const conflict of executeResult.conflictEntries) {
    // 更新原始文件
    updateEntry(vaultPath, conflict.originalFileId, {
      vectorClock: conflict.mergedClock,
      lastSyncedHash: conflict.contentHash,
      lastSyncedClock: conflict.mergedClock,
      lastSyncedSize: conflict.originalSize,
      lastSyncedMtime: conflict.originalMtime,
    });

    // 添加冲突副本
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

  // 5. 保存 FileIndex
  await saveFileIndex(vaultPath);
};
