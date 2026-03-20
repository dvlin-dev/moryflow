import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';

import { assertPCHarnessBuildArtifacts } from '../../../tests/helpers/pc-harness.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('assertPCHarnessBuildArtifacts', () => {
  it('throws a clear error when targeted Playwright runs have no desktop build output', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'pc-harness-test-'));
    tempRoots.push(tempRoot);

    await expect(
      assertPCHarnessBuildArtifacts({
        mainEntry: path.join(tempRoot, 'dist/main/index.js'),
        rendererEntry: path.join(tempRoot, 'dist/renderer/index.html'),
      })
    ).rejects.toThrow(/pnpm --filter @moryflow\/pc build/);
  });

  it('accepts prebuilt desktop artifacts', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'pc-harness-test-'));
    tempRoots.push(tempRoot);

    const mainEntry = path.join(tempRoot, 'dist/main/index.js');
    const rendererEntry = path.join(tempRoot, 'dist/renderer/index.html');
    await mkdir(path.dirname(mainEntry), { recursive: true });
    await mkdir(path.dirname(rendererEntry), { recursive: true });
    await writeFile(mainEntry, 'export {};');
    await writeFile(rendererEntry, '<!doctype html>');

    await expect(
      assertPCHarnessBuildArtifacts({
        mainEntry,
        rendererEntry,
      })
    ).resolves.toBeUndefined();
  });
});
