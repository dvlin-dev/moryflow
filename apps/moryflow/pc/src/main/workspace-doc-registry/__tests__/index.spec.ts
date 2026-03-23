import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLegacyWorkspaceDocRegistryStorePath,
  getWorkspaceDocRegistryStorePath,
} from '../store.js';

describe('workspace-doc-registry', () => {
  let workspacePath: string;
  const profileA = 'user-a:workspace-a';
  const profileB = 'user-b:workspace-b';
  const workspaceA = 'workspace-a';
  const workspaceB = 'workspace-b';

  beforeEach(async () => {
    workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'moryflow-doc-registry-'));
    await fs.mkdir(path.join(workspacePath, 'Docs'), { recursive: true });
  });

  afterEach(async () => {
    vi.resetModules();
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  it('rename 后保持同一个 documentId', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'Alpha.md'), '# Alpha');

    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);
    const first = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Alpha.md'
    );

    await fs.rename(
      path.join(workspacePath, 'Docs', 'Alpha.md'),
      path.join(workspacePath, 'Docs', 'Beta.md')
    );

    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);
    const second = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Beta.md'
    );

    expect(first?.documentId).toBeTruthy();
    expect(second?.documentId).toBe(first?.documentId);
  });

  it('显式 move 会保留 documentId 并更新 path', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'MoveMe.md'), '# Move');
    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);

    const first = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/MoveMe.md'
    );

    await mod.workspaceDocRegistry.move(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/MoveMe.md',
      'Docs/Moved.md'
    );

    const second = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Moved.md'
    );

    expect(second?.documentId).toBe(first?.documentId);
    expect(
      await mod.workspaceDocRegistry.getByPath(
        workspacePath,
        profileA,
        workspaceA,
        'Docs/MoveMe.md'
      )
    ).toBeNull();
  });

  it('升级 v1 registry 后首次 sync 仍能通过 fingerprint 保留 rename 的 documentId', async () => {
    await fs.writeFile(path.join(workspacePath, 'Docs', 'Legacy.md'), '# Legacy');
    const info = await fs.stat(path.join(workspacePath, 'Docs', 'Legacy.md'));

    await fs.mkdir(
      path.dirname(getWorkspaceDocRegistryStorePath(workspacePath, profileA, workspaceA)),
      {
        recursive: true,
      }
    );
    await fs.writeFile(
      getWorkspaceDocRegistryStorePath(workspacePath, profileA, workspaceA),
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              documentId: 'doc-legacy',
              path: 'Docs/Legacy.md',
              fingerprint: `${info.dev}:${info.ino}:${info.size}`,
            },
          ],
        },
        null,
        2
      )
    );

    await fs.rename(
      path.join(workspacePath, 'Docs', 'Legacy.md'),
      path.join(workspacePath, 'Docs', 'Renamed.md')
    );

    const mod = await import('../index.js');
    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);

    const renamed = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Renamed.md'
    );

    expect(renamed?.documentId).toBe('doc-legacy');
  });

  it('删除文档后会从 registry 中移除', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'Gamma.md'), '# Gamma');
    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);

    await fs.rm(path.join(workspacePath, 'Docs', 'Gamma.md'));
    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);

    expect(
      await mod.workspaceDocRegistry.getByPath(workspacePath, profileA, workspaceA, 'Docs/Gamma.md')
    ).toBeNull();
  });

  it('同一个 vault 在不同 profile 下不会复用同一个 documentId', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'Alpha.md'), '# Alpha');

    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);
    await mod.workspaceDocRegistry.sync(workspacePath, profileB, workspaceB);

    const first = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Alpha.md'
    );
    const second = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileB,
      workspaceB,
      'Docs/Alpha.md'
    );

    expect(first?.documentId).toBeTruthy();
    expect(second?.documentId).toBeTruthy();
    expect(second?.documentId).not.toBe(first?.documentId);
  });

  it('会废弃旧版全局 registry，而不是把旧 documentId 注入当前 workspace scope', async () => {
    await fs.writeFile(path.join(workspacePath, 'Docs', 'Alpha.md'), '# Alpha');
    await fs.mkdir(path.dirname(getLegacyWorkspaceDocRegistryStorePath(workspacePath)), {
      recursive: true,
    });
    await fs.writeFile(
      getLegacyWorkspaceDocRegistryStorePath(workspacePath),
      JSON.stringify(
        {
          version: 2,
          entries: [
            {
              documentId: 'doc-legacy',
              path: 'Docs/Alpha.md',
              fingerprint: 'fp-legacy',
              contentFingerprint: 'content-legacy',
            },
          ],
        },
        null,
        2
      )
    );

    const mod = await import('../index.js');
    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);

    const current = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Alpha.md'
    );

    expect(current?.documentId).toBeTruthy();
    expect(current?.documentId).not.toBe('doc-legacy');
    await expect(
      fs.access(getLegacyWorkspaceDocRegistryStorePath(workspacePath))
    ).rejects.toThrow();
  });

  it('仅在 path 当前仍绑定目标 documentId 时才删除 registry entry', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'Alpha.md'), '# Alpha');
    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);

    const first = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Alpha.md'
    );
    expect(first?.documentId).toBeTruthy();

    await mod.workspaceDocRegistry.delete(workspacePath, profileA, workspaceA, {
      relativePath: 'Docs/Alpha.md',
    });

    await mod.workspaceDocRegistry.sync(workspacePath, profileA, workspaceA);
    const rebound = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      profileA,
      workspaceA,
      'Docs/Alpha.md'
    );

    expect(rebound?.documentId).toBeTruthy();
    expect(rebound?.documentId).not.toBe(first?.documentId);

    const removed = await mod.workspaceDocRegistry.delete(workspacePath, profileA, workspaceA, {
      relativePath: 'Docs/Alpha.md',
      expectedDocumentId: first!.documentId,
    });

    expect(removed).toBeNull();
    expect(
      await mod.workspaceDocRegistry.getByPath(workspacePath, profileA, workspaceA, 'Docs/Alpha.md')
    ).toMatchObject({
      documentId: rebound?.documentId,
      path: 'Docs/Alpha.md',
    });
  });
});
