/* @vitest-environment node */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import type { FileIndexStore } from '@moryflow/api';
import { FILE_INDEX_STORE_PATH } from '../../const';
import { fileIndexManager } from '../../file-index';
import { detectLocalChanges, resetHashCache } from '../executor';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
  };
});

const readFileMock = readFile as unknown as { mockClear: () => void; mock: { calls: unknown[][] } };

const createVault = async (): Promise<string> => {
  return mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-'));
};

const writeStore = async (vaultPath: string, store: FileIndexStore): Promise<void> => {
  const storePath = path.join(vaultPath, FILE_INDEX_STORE_PATH);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
};

describe('detectLocalChanges (mtime/size prefilter)', () => {
  let vaultPath = '';

  beforeEach(async () => {
    vaultPath = await createVault();
  });

  afterEach(async () => {
    resetHashCache();
    fileIndexManager.clearCache(vaultPath);
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('skips hashing when mtime/size unchanged', async () => {
    const fileId = 'file-1';
    const relativePath = 'a.md';
    const absolutePath = path.join(vaultPath, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'hello');

    const stats = fs.statSync(absolutePath);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');

    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: fileId,
          path: relativePath,
          createdAt: Date.now(),
          vectorClock: {},
          lastSyncedHash: hash,
          lastSyncedClock: {},
          lastSyncedSize: stats.size,
          lastSyncedMtime: stats.mtimeMs,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);
    readFileMock.mockClear();

    const result = await detectLocalChanges(vaultPath, 'device-1');

    expect(result.pendingChanges.size).toBe(0);
    expect(result.dtos).toHaveLength(1);
    expect(result.dtos[0]?.contentHash).toBe(hash);
    expect(readFileMock.mock.calls.length).toBe(0);
  });

  it('rehashes when mtime/size mismatch', async () => {
    const fileId = 'file-1';
    const relativePath = 'a.md';
    const absolutePath = path.join(vaultPath, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'hello');

    const stats = fs.statSync(absolutePath);

    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: fileId,
          path: relativePath,
          createdAt: Date.now(),
          vectorClock: {},
          lastSyncedHash: 'old-hash',
          lastSyncedClock: {},
          lastSyncedSize: stats.size + 1,
          lastSyncedMtime: stats.mtimeMs,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);
    readFileMock.mockClear();

    const result = await detectLocalChanges(vaultPath, 'device-1');

    expect(readFileMock.mock.calls.length).toBeGreaterThan(0);
    expect(result.pendingChanges.size).toBe(1);
    expect(result.pendingChanges.get(fileId)?.expectedHash).toBe('old-hash');
  });

  it('reuses cached hash when file unchanged but not yet synced', async () => {
    const fileId = 'file-1';
    const relativePath = 'a.md';
    const absolutePath = path.join(vaultPath, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'hello');

    await writeStore(vaultPath, {
      version: 2,
      files: [
        {
          id: fileId,
          path: relativePath,
          createdAt: Date.now(),
          vectorClock: {},
          lastSyncedHash: null,
          lastSyncedClock: {},
          lastSyncedSize: null,
          lastSyncedMtime: null,
        },
      ],
    });

    await fileIndexManager.load(vaultPath);

    await detectLocalChanges(vaultPath, 'device-1');

    readFileMock.mockClear();
    const second = await detectLocalChanges(vaultPath, 'device-1');

    expect(second.pendingChanges.size).toBe(1);
    expect(readFileMock.mock.calls.length).toBe(0);
  });
});
