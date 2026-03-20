import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_DOC_REGISTRY_PATH } from '../store.js';

describe('workspace-doc-registry', () => {
  let workspacePath: string;

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

    await mod.workspaceDocRegistry.sync(workspacePath);
    const first = await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/Alpha.md');

    await fs.rename(
      path.join(workspacePath, 'Docs', 'Alpha.md'),
      path.join(workspacePath, 'Docs', 'Beta.md')
    );

    await mod.workspaceDocRegistry.sync(workspacePath);
    const second = await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/Beta.md');

    expect(first?.documentId).toBeTruthy();
    expect(second?.documentId).toBe(first?.documentId);
  });

  it('显式 move 会保留 documentId 并更新 path', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'MoveMe.md'), '# Move');
    await mod.workspaceDocRegistry.sync(workspacePath);

    const first = await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/MoveMe.md');

    await mod.workspaceDocRegistry.move(workspacePath, 'Docs/MoveMe.md', 'Docs/Moved.md');

    const second = await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/Moved.md');

    expect(second?.documentId).toBe(first?.documentId);
    expect(await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/MoveMe.md')).toBeNull();
  });

  it('升级 v1 registry 后首次 sync 仍能通过 fingerprint 保留 rename 的 documentId', async () => {
    await fs.writeFile(path.join(workspacePath, 'Docs', 'Legacy.md'), '# Legacy');
    const info = await fs.stat(path.join(workspacePath, 'Docs', 'Legacy.md'));

    await fs.mkdir(path.join(workspacePath, '.moryflow'), { recursive: true });
    await fs.writeFile(
      path.join(workspacePath, WORKSPACE_DOC_REGISTRY_PATH),
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
    await mod.workspaceDocRegistry.sync(workspacePath);

    const renamed = await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/Renamed.md');

    expect(renamed?.documentId).toBe('doc-legacy');
  });

  it('删除文档后会从 registry 中移除', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'Gamma.md'), '# Gamma');
    await mod.workspaceDocRegistry.sync(workspacePath);

    await fs.rm(path.join(workspacePath, 'Docs', 'Gamma.md'));
    await mod.workspaceDocRegistry.sync(workspacePath);

    expect(await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/Gamma.md')).toBeNull();
  });
});
