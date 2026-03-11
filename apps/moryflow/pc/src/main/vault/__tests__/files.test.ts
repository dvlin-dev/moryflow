/* @vitest-environment node */
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../context.js', () => ({
  ensureWithinVault: async (target: string) => ({ resolvedTarget: target, vaultRoot: target }),
  ensureVaultAccess: async () => undefined,
}));

vi.mock('../const.js', () => ({
  fileCreateSchema: { parse: (value: unknown) => value },
  fileReadSchema: { parse: (value: unknown) => value },
  fileWriteSchema: { parse: (value: unknown) => value },
  folderCreateSchema: { parse: (value: unknown) => value },
}));

import { createVaultFile, createVaultFolder } from '../files.js';

describe('vault files create', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'moryflow-vault-files-'));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('creates an empty markdown file when the base name is free', async () => {
    const result = await createVaultFile({
      parentPath: tempRoot,
      name: 'NewFile',
    });

    expect(path.basename(result.path)).toBe('NewFile.md');
    await expect(readFile(result.path, 'utf8')).resolves.toBe('');
  });

  it('creates NewFile2.md when NewFile.md already exists', async () => {
    await writeFile(path.join(tempRoot, 'NewFile.md'), 'existing', 'utf8');

    const result = await createVaultFile({
      parentPath: tempRoot,
      name: 'NewFile',
    });

    expect(path.basename(result.path)).toBe('NewFile2.md');
    await expect(readFile(result.path, 'utf8')).resolves.toBe('');
  });

  it('creates NewFile3.md when NewFile.md and NewFile2.md already exist', async () => {
    await writeFile(path.join(tempRoot, 'NewFile.md'), 'first', 'utf8');
    await writeFile(path.join(tempRoot, 'NewFile2.md'), 'second', 'utf8');

    const result = await createVaultFile({
      parentPath: tempRoot,
      name: 'NewFile',
    });

    expect(path.basename(result.path)).toBe('NewFile3.md');
  });

  it('creates NewFolder2 when NewFolder already exists', async () => {
    await mkdir(path.join(tempRoot, 'NewFolder'));

    const result = await createVaultFolder({
      parentPath: tempRoot,
      name: 'NewFolder',
    });

    expect(path.basename(result.path)).toBe('NewFolder2');
  });

  it('applies uniqueness within the requested parent directory only', async () => {
    const siblingParent = path.join(tempRoot, 'nested');
    await mkdir(siblingParent);
    await writeFile(path.join(tempRoot, 'NewFile.md'), 'root', 'utf8');

    const result = await createVaultFile({
      parentPath: siblingParent,
      name: 'NewFile',
    });

    expect(path.dirname(result.path)).toBe(siblingParent);
    expect(path.basename(result.path)).toBe('NewFile.md');
  });
});
