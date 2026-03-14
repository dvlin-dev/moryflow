import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('workspace-doc-registry', () => {
  let workspacePath: string;

  beforeEach(async () => {
    workspacePath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'moryflow-doc-registry-'),
    );
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
    const first = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      'Docs/Alpha.md',
    );

    await fs.rename(
      path.join(workspacePath, 'Docs', 'Alpha.md'),
      path.join(workspacePath, 'Docs', 'Beta.md'),
    );

    await mod.workspaceDocRegistry.sync(workspacePath);
    const second = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      'Docs/Beta.md',
    );

    expect(first?.documentId).toBeTruthy();
    expect(second?.documentId).toBe(first?.documentId);
  });

  it('显式 move 会保留 documentId 并更新 path', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'MoveMe.md'), '# Move');
    await mod.workspaceDocRegistry.sync(workspacePath);

    const first = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      'Docs/MoveMe.md',
    );

    await mod.workspaceDocRegistry.move(
      workspacePath,
      'Docs/MoveMe.md',
      'Docs/Moved.md',
    );

    const second = await mod.workspaceDocRegistry.getByPath(
      workspacePath,
      'Docs/Moved.md',
    );

    expect(second?.documentId).toBe(first?.documentId);
    expect(
      await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/MoveMe.md'),
    ).toBeNull();
  });

  it('删除文档后会从 registry 中移除', async () => {
    const mod = await import('../index.js');

    await fs.writeFile(path.join(workspacePath, 'Docs', 'Gamma.md'), '# Gamma');
    await mod.workspaceDocRegistry.sync(workspacePath);

    await fs.rm(path.join(workspacePath, 'Docs', 'Gamma.md'));
    await mod.workspaceDocRegistry.sync(workspacePath);

    expect(
      await mod.workspaceDocRegistry.getByPath(workspacePath, 'Docs/Gamma.md'),
    ).toBeNull();
  });
});
