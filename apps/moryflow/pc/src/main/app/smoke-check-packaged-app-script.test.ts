import { execFile as execFileCallback } from 'node:child_process';
import { chmodSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createPackage } from '@electron/asar';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveSmokeCheckAppPath } from '../../../scripts/smoke-check-packaged-app-lib';

const execFile = promisify(execFileCallback);
const scriptPath = path.resolve(process.cwd(), 'scripts/smoke-check-packaged-app.ts');

const execSmokeCheck = (args: string[]) =>
  execFile(process.execPath, ['--import', 'tsx', scriptPath, ...args], {
    cwd: process.cwd(),
  });

const writeRequiredPackage = async (rootDir: string, packageName: string) => {
  const packagePath = path.join(rootDir, 'node_modules', ...packageName.split('/'));
  await fs.mkdir(packagePath, { recursive: true });
  await fs.writeFile(
    path.join(packagePath, 'package.json'),
    JSON.stringify({ name: packageName, version: '0.0.0-test' }, null, 2)
  );
};

const createFakeAppBundle = async (options: {
  appName: string;
  packagedModules: string[];
  binaryScript: string;
}) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smoke-check-packaged-app-'));
  const appDir = path.join(tempDir, `${options.appName}.app`);
  const appBinaryPath = path.join(appDir, 'Contents', 'MacOS', options.appName);
  const asarSourceDir = path.join(tempDir, 'asar-src');
  const asarPath = path.join(appDir, 'Contents', 'Resources', 'app.asar');

  await fs.mkdir(path.dirname(appBinaryPath), { recursive: true });
  await fs.mkdir(asarSourceDir, { recursive: true });

  for (const packageName of options.packagedModules) {
    await writeRequiredPackage(asarSourceDir, packageName);
  }

  await createPackage(asarSourceDir, asarPath);
  await fs.writeFile(appBinaryPath, options.binaryScript);
  chmodSync(appBinaryPath, 0o755);

  return { appDir, tempDir };
};

describe('smoke-check-packaged-app script', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      })
    );
  });

  it('fails when app.asar is missing a required runtime package', async () => {
    const bundle = await createFakeAppBundle({
      appName: 'MoryFlow',
      packagedModules: ['@openai/agents-core'],
      binaryScript: '#!/bin/sh\nexec sleep 5\n',
    });
    tempDirs.push(bundle.tempDir);

    await expect(
      execSmokeCheck([
        '--app',
        bundle.appDir,
        '--require-package',
        '@openai/agents',
        '--timeout-ms',
        '200',
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Missing required package in app.asar: @openai/agents'),
    });
  });

  it('fails when the packaged app exits before the smoke timeout', async () => {
    const bundle = await createFakeAppBundle({
      appName: 'MoryFlow',
      packagedModules: ['@openai/agents'],
      binaryScript: '#!/bin/sh\nexit 0\n',
    });
    tempDirs.push(bundle.tempDir);

    await expect(
      execSmokeCheck([
        '--app',
        bundle.appDir,
        '--require-package',
        '@openai/agents',
        '--timeout-ms',
        '1000',
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Packaged app exited before smoke timeout'),
    });
  });

  it('succeeds when required packages exist and the app stays alive for the smoke window', async () => {
    const bundle = await createFakeAppBundle({
      appName: 'MoryFlow',
      packagedModules: ['@openai/agents', '@openai/agents-core', '@openai/agents-extensions'],
      binaryScript: '#!/bin/sh\nexec sleep 15\n',
    });
    tempDirs.push(bundle.tempDir);

    const { stdout } = await execSmokeCheck([
      '--app',
      bundle.appDir,
      '--require-package',
      '@openai/agents',
      '--require-package',
      '@openai/agents-core',
      '--require-package',
      '@openai/agents-extensions',
      '--timeout-ms',
      '1000',
    ]);

    expect(stdout).toContain('"status": "ok"');
  });

  it('resolves the packaged app from a release directory without hardcoding electron-builder output names', async () => {
    const bundle = await createFakeAppBundle({
      appName: 'MoryFlow',
      packagedModules: ['@openai/agents', '@openai/agents-core', '@openai/agents-extensions'],
      binaryScript: '#!/bin/sh\nexec sleep 15\n',
    });
    tempDirs.push(bundle.tempDir);

    const releaseDir = path.join(bundle.tempDir, 'release', '0.0.0-test', 'mac');
    await fs.mkdir(releaseDir, { recursive: true });
    await fs.rename(bundle.appDir, path.join(releaseDir, 'MoryFlow.app'));

    const appPath = await resolveSmokeCheckAppPath({
      appDir: path.join(bundle.tempDir, 'release', '0.0.0-test'),
    });

    expect(appPath).toBe(path.join(releaseDir, 'MoryFlow.app'));
  });

  it('supports --app-dir through the CLI without hardcoding electron-builder output names', async () => {
    const bundle = await createFakeAppBundle({
      appName: 'MoryFlow',
      packagedModules: ['@openai/agents', '@openai/agents-core', '@openai/agents-extensions'],
      binaryScript: '#!/bin/sh\nexec sleep 15\n',
    });
    tempDirs.push(bundle.tempDir);

    const releaseDir = path.join(bundle.tempDir, 'release', '0.0.0-test', 'mac');
    await fs.mkdir(releaseDir, { recursive: true });
    await fs.rename(bundle.appDir, path.join(releaseDir, 'MoryFlow.app'));

    const { stdout } = await execSmokeCheck([
      '--app-dir',
      path.join(bundle.tempDir, 'release', '0.0.0-test'),
      '--require-package',
      '@openai/agents',
      '--require-package',
      '@openai/agents-core',
      '--require-package',
      '@openai/agents-extensions',
      '--timeout-ms',
      '1000',
    ]);

    expect(stdout).toContain('"status": "ok"');
    expect(stdout).toContain(path.join('release', '0.0.0-test', 'mac', 'MoryFlow.app'));
  });

  it('fails path resolution when app-dir contains multiple app bundles', async () => {
    const first = await createFakeAppBundle({
      appName: 'MoryFlow',
      packagedModules: ['@openai/agents'],
      binaryScript: '#!/bin/sh\nexec sleep 5\n',
    });
    const second = await createFakeAppBundle({
      appName: 'Anyhunt',
      packagedModules: ['@openai/agents'],
      binaryScript: '#!/bin/sh\nexec sleep 5\n',
    });
    tempDirs.push(first.tempDir, second.tempDir);

    const releaseDir = path.join(first.tempDir, 'release');
    await fs.mkdir(releaseDir, { recursive: true });
    await fs.rename(first.appDir, path.join(releaseDir, 'MoryFlow.app'));
    await fs.cp(second.appDir, path.join(releaseDir, 'Anyhunt.app'), { recursive: true });

    await expect(
      resolveSmokeCheckAppPath({
        appDir: releaseDir,
      })
    ).rejects.toThrow(/Expected exactly one packaged \.app bundle/);
  });

  it('fails path resolution when app-dir contains no app bundle', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smoke-check-packaged-empty-'));
    tempDirs.push(emptyDir);

    await expect(
      resolveSmokeCheckAppPath({
        appDir: emptyDir,
      })
    ).rejects.toThrow(new RegExp(`Could not find a packaged \\.app bundle under ${emptyDir}`));
  });
});
