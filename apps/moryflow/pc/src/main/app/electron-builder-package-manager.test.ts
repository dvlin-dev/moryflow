import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pcAppDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('electron-builder package manager detection', () => {
  it('pins the pc app directory to isolated node-linker for packaging', async () => {
    const npmrc = await fs.readFile(path.join(pcAppDir, '.npmrc'), 'utf8');
    expect(npmrc).toContain('node-linker=isolated');
  });

  it('detects the pc app directory as a pnpm project', async () => {
    const { detect } = await import('app-builder-lib/out/node-module-collector/index.js');

    await expect(detect({ cwd: pcAppDir })).resolves.toBe('pnpm');
  });
});
