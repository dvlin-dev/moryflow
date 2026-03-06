/* @vitest-environment node */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readInstalledPackageManifest } from './resolver';

const tempDirs: string[] = [];

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-resolver-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('readInstalledPackageManifest', () => {
  it('rejects package names containing path traversal segments', async () => {
    const runtimeDir = await createTempDir();

    await expect(
      readInstalledPackageManifest(runtimeDir, '../../../../usr/lib/node_modules/npm')
    ).rejects.toThrow('Invalid package name');
  });

  it('reads scoped package manifest inside managed node_modules', async () => {
    const runtimeDir = await createTempDir();
    const packageDir = path.join(runtimeDir, 'node_modules', '@scope', 'demo');
    await fs.mkdir(packageDir, { recursive: true });
    await fs.writeFile(
      path.join(packageDir, 'package.json'),
      JSON.stringify({
        name: '@scope/demo',
        version: '1.2.3',
        bin: {
          demo: 'dist/cli.js',
        },
      }),
      'utf-8'
    );

    const manifest = await readInstalledPackageManifest(runtimeDir, '@scope/demo');
    expect(manifest.version).toBe('1.2.3');
    expect(manifest.packageDir).toBe(packageDir);
    expect(manifest.bin).toEqual({
      demo: 'dist/cli.js',
    });
  });
});
