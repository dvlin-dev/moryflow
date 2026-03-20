import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('workspace-meta identity', () => {
  let workspacePath: string;

  beforeEach(async () => {
    workspacePath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'moryflow-workspace-meta-'),
    );
  });

  afterEach(async () => {
    vi.resetModules();
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  it('首次读取会创建 .moryflow/workspace.json', async () => {
    const mod = await import('../identity.js');

    const identity = await mod.ensureWorkspaceIdentity(workspacePath);
    const saved = JSON.parse(
      await fs.readFile(mod.getWorkspaceIdentityPath(workspacePath), 'utf8'),
    );

    expect(saved).toEqual(identity);
  });

  it('再次读取会复用已有 workspace identity', async () => {
    const mod = await import('../identity.js');

    const first = await mod.ensureWorkspaceIdentity(workspacePath);
    const second = await mod.ensureWorkspaceIdentity(workspacePath);

    expect(second).toEqual(first);
  });

  it('目录 rename 后仍复用同一个 workspace identity', async () => {
    const mod = await import('../identity.js');

    const first = await mod.ensureWorkspaceIdentity(workspacePath);
    const renamedPath = `${workspacePath}-renamed`;
    await fs.cp(workspacePath, renamedPath, { recursive: true });

    const second = await mod.ensureWorkspaceIdentity(renamedPath);

    expect(second).toEqual(first);
    await fs.rm(renamedPath, { recursive: true, force: true });
  });

  it('并发初始化时仍只会落同一个 workspace identity', async () => {
    const mod = await import('../identity.js');

    const [first, second] = await Promise.all([
      mod.ensureWorkspaceIdentity(workspacePath),
      mod.ensureWorkspaceIdentity(workspacePath),
    ]);

    expect(second).toEqual(first);
    const saved = JSON.parse(
      await fs.readFile(mod.getWorkspaceIdentityPath(workspacePath), 'utf8'),
    );
    expect(saved).toEqual(first);
  });
});
