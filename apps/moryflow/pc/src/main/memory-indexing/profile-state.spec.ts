/* @vitest-environment node */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('memoryIndexingProfileState', () => {
  let workspacePath: string;

  beforeEach(async () => {
    workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'moryflow-memory-indexing-'));
  });

  afterEach(async () => {
    vi.resetModules();
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  it('persists uploaded documents per profile/workspace pair', async () => {
    const { memoryIndexingProfileState } = await import('./profile-state.js');

    await memoryIndexingProfileState.markUploadedDocument(
      workspacePath,
      'user-a:client-workspace-1',
      'workspace-1',
      'doc-1'
    );

    memoryIndexingProfileState.clearCache(workspacePath);

    await expect(
      memoryIndexingProfileState.listUploadedDocumentIds(
        workspacePath,
        'user-a:client-workspace-1',
        'workspace-1'
      )
    ).resolves.toEqual(new Set(['doc-1']));
  });

  it('serializes concurrent uploaded document writes for the same profile/workspace pair', async () => {
    const { memoryIndexingProfileState } = await import('./profile-state.js');

    await Promise.all([
      memoryIndexingProfileState.markUploadedDocument(
        workspacePath,
        'user-a:client-workspace-1',
        'workspace-1',
        'doc-1'
      ),
      memoryIndexingProfileState.markUploadedDocument(
        workspacePath,
        'user-a:client-workspace-1',
        'workspace-1',
        'doc-2'
      ),
    ]);

    memoryIndexingProfileState.clearCache(workspacePath);

    await expect(
      memoryIndexingProfileState.listUploadedDocumentIds(
        workspacePath,
        'user-a:client-workspace-1',
        'workspace-1'
      )
    ).resolves.toEqual(new Set(['doc-1', 'doc-2']));
  });

  it('resets uploaded documents when the same profile key points to a new workspaceId', async () => {
    const { memoryIndexingProfileState } = await import('./profile-state.js');

    await memoryIndexingProfileState.markUploadedDocument(
      workspacePath,
      'user-a:client-workspace-1',
      'workspace-1',
      'doc-1'
    );

    memoryIndexingProfileState.clearCache(workspacePath);

    await expect(
      memoryIndexingProfileState.listUploadedDocumentIds(
        workspacePath,
        'user-a:client-workspace-1',
        'workspace-2'
      )
    ).resolves.toEqual(new Set());
  });
});
