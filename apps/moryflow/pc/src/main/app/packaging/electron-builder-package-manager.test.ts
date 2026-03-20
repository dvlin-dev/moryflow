import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const requireFromCurrentFile = createRequire(import.meta.url);
const pcAppDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const requireFromPcApp = createRequire(path.join(pcAppDir, 'package.json'));

describe('electron-builder package manager detection', () => {
  it('pins the pc app directory to isolated node-linker for packaging', async () => {
    const npmrc = await fs.readFile(path.join(pcAppDir, '.npmrc'), 'utf8');
    expect(npmrc).toContain('node-linker=isolated');
  });

  it('routes pack and dist commands through the electron-builder wrapper', async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(pcAppDir, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
    };

    for (const name of ['pack', 'dist', 'dist:mac', 'dist:win', 'dist:linux', 'dist:all']) {
      expect(packageJson.scripts[name]).toContain('node ./scripts/run-electron-builder.cjs');
    }
  });

  it('detects the pc app directory as a pnpm project with isolated node-linker', async () => {
    const requireFromElectronBuilder = createRequire(
      requireFromPcApp.resolve('electron-builder/package.json')
    );
    const { detect } = await import(
      requireFromElectronBuilder.resolve('app-builder-lib/out/node-module-collector/index.js')
    );
    const { getElectronBuilderEnv } = requireFromCurrentFile(
      path.join(pcAppDir, 'scripts/run-electron-builder.cjs')
    ) as {
      getElectronBuilderEnv: (baseEnv?: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
    };

    await expect(detect({ cwd: pcAppDir })).resolves.toBe('pnpm');

    const { stdout } = await execFileAsync('pnpm', ['config', 'get', 'node-linker'], {
      cwd: pcAppDir,
      env: getElectronBuilderEnv(process.env),
    });
    expect(stdout.trim()).toBe('isolated');
  });
});
