/**
 * [INPUT]: vaultPath, deviceId
 * [OUTPUT]: DetectChangesResult（dtos/pendingChanges/localStates）
 * [POS]: 收集本地文件元数据，用于同步差异计算（支持 mtime/size 预过滤）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { File, Paths } from 'expo-file-system';
import { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } from 'expo-crypto';
import { fileIndexManager } from '@/lib/vault/file-index';
import { MAX_SYNC_FILE_SIZE } from './const';
import {
  buildLocalChanges,
  type DetectChangesResult,
  type FileSnapshot,
} from './file-collector-core';

export type {
  PendingChange,
  LocalFileState,
  DetectChangesResult,
  FileSnapshot,
} from './file-collector-core';

// ── 工具函数 ────────────────────────────────────────────────

/** 计算文件内容的 SHA256 哈希 */
export const computeHash = async (content: string): Promise<string> => {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, content, {
    encoding: CryptoEncoding.HEX,
  });
};

// ── 哈希缓存（避免重复读取）──────────────────────────────────

interface HashCacheEntry {
  size: number;
  mtime: number;
  hash: string;
}

const HASH_CACHE_LIMIT = 2000;
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

// ── 收集本地文件信息 ────────────────────────────────────────

/** 收集 vault 中所有已跟踪文件的信息 */
export const detectLocalChanges = async (
  vaultPath: string,
  deviceId: string
): Promise<DetectChangesResult> => {
  const entries = fileIndexManager.getAll(vaultPath);
  const snapshots: FileSnapshot[] = [];

  for (const entry of entries) {
    const absolutePath = Paths.join(vaultPath, entry.path);
    try {
      const file = new File(absolutePath);
      if (!file.exists) {
        hashCache.delete(buildCacheKey(vaultPath, entry.id));
        snapshots.push({
          fileId: entry.id,
          path: entry.path,
          size: 0,
          mtime: null,
          contentHash: '',
          exists: false,
        });
        continue;
      }

      let info: ReturnType<File['info']> | null = null;
      try {
        info = file.info();
      } catch {
        info = null;
      }

      const size = typeof info?.size === 'number' ? info.size : (file.size ?? 0);
      const mtime =
        typeof info?.modificationTime === 'number'
          ? info.modificationTime
          : (file.modificationTime ?? null);

      if (size && size > MAX_SYNC_FILE_SIZE) {
        console.warn(
          `[CloudSync] Skipping large file (${(size / 1024 / 1024).toFixed(1)}MB): ${entry.path}`
        );
        continue;
      }

      const cacheKey = buildCacheKey(vaultPath, entry.id);
      const cachedHash = typeof mtime === 'number' ? getCachedHash(cacheKey, size, mtime) : null;
      const canReuseHash =
        entry.lastSyncedHash !== null &&
        typeof entry.lastSyncedSize === 'number' &&
        typeof entry.lastSyncedMtime === 'number' &&
        entry.lastSyncedSize === size &&
        entry.lastSyncedMtime === mtime;

      let contentHash: string;
      if (canReuseHash) {
        contentHash = entry.lastSyncedHash as string;
      } else if (cachedHash) {
        contentHash = cachedHash;
      } else {
        const content = file.textSync();
        contentHash = await computeHash(content);
      }

      if (typeof mtime === 'number') {
        setCachedHash(cacheKey, size, mtime, contentHash);
      }

      snapshots.push({
        fileId: entry.id,
        path: entry.path,
        size,
        mtime,
        contentHash,
        exists: true,
      });
    } catch {
      hashCache.delete(buildCacheKey(vaultPath, entry.id));
      snapshots.push({
        fileId: entry.id,
        path: entry.path,
        size: 0,
        mtime: null,
        contentHash: '',
        exists: false,
      });
    }
  }

  return buildLocalChanges(entries, snapshots, deviceId);
};
