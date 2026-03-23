/* @vitest-environment node */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { workspaceDocRegistry } from '../../../workspace-doc-registry/index.js';
import {
  ensureSyncMirrorEntry,
  resetSyncMirror,
  updateSyncMirrorEntry,
} from '../../sync-mirror-state.js';
import { detectLocalChanges, resetHashCache } from '../executor';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
  };
});

const readFileMock = readFile as unknown as {
  mockClear: () => void;
  mock: { calls: unknown[][] };
};

describe('detectLocalChanges (mtime/size prefilter)', () => {
  let vaultPath = '';
  const profileKey = 'profile-1';
  const workspaceId = 'workspace-1';

  beforeEach(async () => {
    vaultPath = await mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-'));
  });

  afterEach(async () => {
    resetHashCache();
    await resetSyncMirror(vaultPath, profileKey, workspaceId);
    await workspaceDocRegistry.clear(vaultPath, profileKey, workspaceId);
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('skips hashing when mtime/size unchanged', async () => {
    const relativePath = 'a.md';
    const absolutePath = path.join(vaultPath, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'hello');
    await workspaceDocRegistry.sync(vaultPath, profileKey, workspaceId);

    const entry = await workspaceDocRegistry.getByPath(
      vaultPath,
      profileKey,
      workspaceId,
      relativePath
    );
    const stats = fs.statSync(absolutePath);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');

    expect(entry?.documentId).toBeTruthy();
    await ensureSyncMirrorEntry(
      vaultPath,
      profileKey,
      workspaceId,
      entry!.documentId,
      relativePath
    );
    await updateSyncMirrorEntry(vaultPath, profileKey, workspaceId, entry!.documentId, {
      vectorClock: {},
      lastSyncedHash: hash,
      lastSyncedClock: {},
      lastSyncedSize: stats.size,
      lastSyncedMtime: stats.mtimeMs,
    });

    readFileMock.mockClear();

    const result = await detectLocalChanges(vaultPath, profileKey, workspaceId, 'device-1');

    expect(result.pendingChanges.size).toBe(0);
    expect(result.dtos).toHaveLength(1);
    expect(result.dtos[0]?.contentHash).toBe(hash);
    expect(readFileMock.mock.calls.length).toBe(0);
  });

  it('rehashes when mtime/size mismatch', async () => {
    const relativePath = 'a.md';
    const absolutePath = path.join(vaultPath, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'hello');
    await workspaceDocRegistry.sync(vaultPath, profileKey, workspaceId);

    const entry = await workspaceDocRegistry.getByPath(
      vaultPath,
      profileKey,
      workspaceId,
      relativePath
    );
    const stats = fs.statSync(absolutePath);

    await ensureSyncMirrorEntry(
      vaultPath,
      profileKey,
      workspaceId,
      entry!.documentId,
      relativePath
    );
    await updateSyncMirrorEntry(vaultPath, profileKey, workspaceId, entry!.documentId, {
      vectorClock: {},
      lastSyncedHash: 'old-hash',
      lastSyncedClock: {},
      lastSyncedSize: stats.size + 1,
      lastSyncedMtime: stats.mtimeMs,
    });

    readFileMock.mockClear();

    const result = await detectLocalChanges(vaultPath, profileKey, workspaceId, 'device-1');

    expect(readFileMock.mock.calls.length).toBeGreaterThan(0);
    expect(result.pendingChanges.size).toBe(1);
    expect(result.pendingChanges.get(entry!.documentId)?.expectedHash).toBe('old-hash');
  });

  it('reuses cached hash when file unchanged but not yet synced', async () => {
    const relativePath = 'a.md';
    const absolutePath = path.join(vaultPath, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'hello');
    await workspaceDocRegistry.sync(vaultPath, profileKey, workspaceId);

    const entry = await workspaceDocRegistry.getByPath(
      vaultPath,
      profileKey,
      workspaceId,
      relativePath
    );
    expect(entry?.documentId).toBeTruthy();

    await detectLocalChanges(vaultPath, profileKey, workspaceId, 'device-1');

    readFileMock.mockClear();
    const second = await detectLocalChanges(vaultPath, profileKey, workspaceId, 'device-1');

    expect(second.pendingChanges.size).toBe(1);
    expect(readFileMock.mock.calls.length).toBe(0);
  });
});
