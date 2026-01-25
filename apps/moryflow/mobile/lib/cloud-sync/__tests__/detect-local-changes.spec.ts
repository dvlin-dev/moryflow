/**
 * [INPUT]: file index entries and file metadata
 * [OUTPUT]: detectLocalChanges results with hash reuse behavior
 * [POS]: Mobile Cloud Sync detectLocalChanges tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyClock } from '@anyhunt/sync';
import type { FileEntry } from '@anyhunt/api';

const fileSystem = vi.hoisted(() => {
  const nodePath = require('node:path') as typeof import('node:path');
  const files = new Map<string, { content: string; size: number; mtime: number }>();
  let readCount = 0;

  const setFile = (filePath: string, content: string, size: number, mtime: number): void => {
    files.set(filePath, { content, size, mtime });
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
      return files.get(this.uri)?.size ?? 0;
    }

    get modificationTime(): number | null {
      return files.get(this.uri)?.mtime ?? null;
    }

    textSync(): string {
      readCount += 1;
      return files.get(this.uri)?.content ?? '';
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

  const Paths = {
    join: nodePath.join,
  };

  const getReadCount = () => readCount;
  const resetReadCount = () => {
    readCount = 0;
  };

  return { files, setFile, File, Paths, getReadCount, resetReadCount };
});

const { files, setFile, getReadCount, resetReadCount } = fileSystem;

vi.mock(
  'expo-file-system',
  () => ({
    File: fileSystem.File,
    Paths: fileSystem.Paths,
  }),
  { virtual: true }
);

vi.mock(
  'react-native',
  () => ({
    Platform: {
      OS: 'ios',
      Version: '17',
      select: (options: { ios?: string; android?: string; default?: string }) =>
        options?.ios ?? options?.default ?? 'ios',
    },
  }),
  { virtual: true }
);

vi.mock(
  'expo-crypto',
  () => ({
    digestStringAsync: vi.fn(async () => 'hash'),
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    CryptoEncoding: { HEX: 'hex' },
  }),
  { virtual: true }
);

vi.mock('../const', () => ({
  MAX_SYNC_FILE_SIZE: 10 * 1024 * 1024,
  extractTitle: (filePath: string) => filePath.replace(/^.*\//, '').replace(/\.[^/.]+$/, ''),
}));

vi.mock('@/lib/vault/file-index', () => ({
  fileIndexManager: {
    getAll: vi.fn(),
  },
}));

import * as fileCollector from '../file-collector';
import { fileIndexManager } from '@/lib/vault/file-index';

describe('detectLocalChanges', () => {
  const vaultPath = '/vault';
  const deviceId = 'device-1';

  beforeEach(() => {
    files.clear();
    vi.clearAllMocks();
    fileCollector.resetHashCache();
    resetReadCount();
  });

  it('reuses lastSyncedHash when size/mtime match', async () => {
    const entry: FileEntry = {
      id: 'file-1',
      path: 'note.md',
      createdAt: 1,
      vectorClock: createEmptyClock(),
      lastSyncedHash: 'hash-1',
      lastSyncedClock: createEmptyClock(),
      lastSyncedSize: 10,
      lastSyncedMtime: 100,
    };

    setFile('/vault/note.md', 'local', 10, 100);
    vi.mocked(fileIndexManager.getAll).mockReturnValue([entry]);

    const result = await fileCollector.detectLocalChanges(vaultPath, deviceId);

    expect(getReadCount()).toBe(0);
    expect(result.dtos[0]?.contentHash).toBe('hash-1');
    expect(result.pendingChanges.size).toBe(0);
    expect(result.localStates.get('file-1')?.mtime).toBe(100);
  });

  it('reuses hash cache across runs when stats unchanged', async () => {
    const entry: FileEntry = {
      id: 'file-1',
      path: 'note.md',
      createdAt: 1,
      vectorClock: createEmptyClock(),
      lastSyncedHash: null,
      lastSyncedClock: createEmptyClock(),
      lastSyncedSize: null,
      lastSyncedMtime: null,
    };

    setFile('/vault/note.md', 'local', 10, 100);
    vi.mocked(fileIndexManager.getAll).mockReturnValue([entry]);

    await fileCollector.detectLocalChanges(vaultPath, deviceId);
    await fileCollector.detectLocalChanges(vaultPath, deviceId);

    expect(getReadCount()).toBe(1);
  });
});
