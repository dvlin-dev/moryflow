import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('electron-builder package manager detection', () => {
  it('pins the pc app directory to isolated node-linker for packaging', async () => {
    const npmrc = await fs.readFile(path.join(process.cwd(), '.npmrc'), 'utf8');
    expect(npmrc).toContain('node-linker=isolated');
  });

  it('detects the pc app directory as a pnpm project', async () => {
    const { detect, getCollectorByPackageManager } =
      await import('app-builder-lib/out/node-module-collector/index.js');

    await expect(detect({ cwd: process.cwd() })).resolves.toBe('pnpm');

    const collector = await getCollectorByPackageManager(process.cwd());
    expect(collector.constructor.name).toBe('PnpmNodeModulesCollector');
  });
});
