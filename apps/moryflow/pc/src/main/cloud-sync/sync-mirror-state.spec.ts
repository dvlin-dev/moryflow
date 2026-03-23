import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCloudSyncProfileStatePath } from './profile-storage.js';
import { getAllSyncMirrorEntries, loadSyncMirror, resetSyncMirror } from './sync-mirror-state.js';

describe('sync-mirror-state', () => {
  let workspacePath: string;
  const profileKey = 'user-1:client-workspace-1';
  const workspaceId = 'workspace-1';

  beforeEach(async () => {
    workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'moryflow-sync-mirror-'));
  });

  afterEach(async () => {
    await resetSyncMirror(workspacePath, profileKey, workspaceId);
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  it('ignores and deletes the legacy profile-scoped sync mirror store', async () => {
    const legacyPath = getCloudSyncProfileStatePath(workspacePath, profileKey, 'sync-mirror.json');
    await fs.mkdir(path.dirname(legacyPath), { recursive: true });
    await fs.writeFile(
      legacyPath,
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              documentId: 'doc-legacy',
              path: 'Docs/Alpha.md',
              createdAt: 1,
              vectorClock: {},
              lastSyncedHash: 'hash-legacy',
              lastSyncedClock: {},
              lastSyncedSize: 1,
              lastSyncedMtime: 1,
              lastSyncedStorageRevision: 'rev-legacy',
            },
          ],
        },
        null,
        2
      )
    );

    await loadSyncMirror(workspacePath, profileKey, workspaceId);

    expect(getAllSyncMirrorEntries(workspacePath, profileKey, workspaceId)).toEqual([]);
    await expect(fs.access(legacyPath)).rejects.toThrow();
  });
});
