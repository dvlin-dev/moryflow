/**
 * [PROVIDES]: buildLocalChanges, 本地变更差异计算（基于快照 hash/size/mtime/skipped）
 * [DEPENDS]: @anyhunt/sync（向量时钟）
 * [POS]: Cloud Sync 纯逻辑模块（不依赖 RN/Expo）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { LocalFileDto } from '@anyhunt/api/cloud-sync';
import type { FileEntry } from '@anyhunt/api';
import { incrementClock } from '@anyhunt/sync';

// ── 类型定义 ────────────────────────────────────────────────

export interface PendingChange {
  type: 'new' | 'modified' | 'deleted';
  fileId: string;
  path: string;
  vectorClock: FileEntry['vectorClock'];
  contentHash: string;
  expectedHash?: string;
}

export interface LocalFileState {
  fileId: string;
  path: string;
  contentHash: string;
  size: number;
  mtime: number | null;
}

export interface DetectChangesResult {
  dtos: LocalFileDto[];
  pendingChanges: Map<string, PendingChange>;
  localStates: Map<string, LocalFileState>;
}

export interface FileSnapshot {
  fileId: string;
  path: string;
  size: number;
  mtime: number | null;
  contentHash: string;
  exists: boolean;
  skipped?: boolean;
}

// ── 工具函数 ────────────────────────────────────────────────

const extractTitleFromPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const fileName = segments[segments.length - 1] ?? normalized;
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
};

// ── 核心逻辑 ────────────────────────────────────────────────

export function buildLocalChanges(
  entries: FileEntry[],
  snapshots: FileSnapshot[],
  deviceId: string
): DetectChangesResult {
  const dtos: LocalFileDto[] = [];
  const pendingChanges = new Map<string, PendingChange>();
  const localStates = new Map<string, LocalFileState>();

  const snapshotMap = new Map(snapshots.map((s) => [s.fileId, s]));

  for (const entry of entries) {
    const snapshot = snapshotMap.get(entry.id);

    if (snapshot?.skipped) {
      if (entry.lastSyncedHash !== null) {
        dtos.push({
          fileId: entry.id,
          path: entry.path,
          title: extractTitleFromPath(entry.path),
          size: snapshot.size,
          contentHash: snapshot.contentHash,
          vectorClock: entry.vectorClock,
        });

        localStates.set(entry.id, {
          fileId: entry.id,
          path: entry.path,
          contentHash: snapshot.contentHash,
          size: snapshot.size,
          mtime: snapshot.mtime,
        });
      }
      continue;
    }

    if (snapshot?.exists) {
      const hasChanged = snapshot.contentHash !== entry.lastSyncedHash;
      const clockToSend = hasChanged
        ? incrementClock(entry.vectorClock, deviceId)
        : entry.vectorClock;

      dtos.push({
        fileId: entry.id,
        path: entry.path,
        title: extractTitleFromPath(entry.path),
        size: snapshot.size,
        contentHash: snapshot.contentHash,
        vectorClock: clockToSend,
      });

      localStates.set(entry.id, {
        fileId: entry.id,
        path: entry.path,
        contentHash: snapshot.contentHash,
        size: snapshot.size,
        mtime: snapshot.mtime,
      });

      if (hasChanged) {
        pendingChanges.set(entry.id, {
          type: entry.lastSyncedHash === null ? 'new' : 'modified',
          fileId: entry.id,
          path: entry.path,
          vectorClock: clockToSend,
          contentHash: snapshot.contentHash,
          expectedHash: entry.lastSyncedHash ?? undefined,
        });
      }
      continue;
    }

    if (entry.lastSyncedHash !== null) {
      const deleteClock = incrementClock(entry.vectorClock, deviceId);

      dtos.push({
        fileId: entry.id,
        path: entry.path,
        title: extractTitleFromPath(entry.path),
        size: 0,
        contentHash: '',
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

  return { dtos, pendingChanges, localStates };
}
