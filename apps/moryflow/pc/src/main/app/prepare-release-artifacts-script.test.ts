import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const writeTargetBundle = async (
  inputDir: string,
  targetDir: string,
  feedFilename: string,
  artifactFilename: string
) => {
  const dir = path.join(inputDir, targetDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, feedFilename),
    [
      'version: 0.2.16',
      `path: ${artifactFilename}`,
      'files:',
      `  - url: ${artifactFilename}`,
      '    sha512: test',
      '    size: 1',
      'sha512: test',
      'releaseDate: 2026-03-08T10:00:00.000Z',
      '',
    ].join('\n')
  );
  await fs.writeFile(path.join(dir, artifactFilename), 'artifact');
};

describe('prepare-release-artifacts script', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      })
    );
  });

  it('preserves the not-a-directory error when an artifact path is a file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prepare-release-artifacts-'));
    tempDirs.push(tempDir);

    const inputDir = path.join(tempDir, 'input');
    const outputDir = path.join(tempDir, 'output');
    await fs.mkdir(inputDir, { recursive: true });

    await writeTargetBundle(
      inputDir,
      'darwin-arm64',
      'latest-mac.yml',
      'MoryFlow-0.2.16-arm64.dmg'
    );
    await writeTargetBundle(inputDir, 'win32-x64', 'latest.yml', 'MoryFlow-0.2.16-Setup.exe');
    await fs.writeFile(path.join(inputDir, 'darwin-x64'), 'not a directory');

    const scriptPath = path.resolve(process.cwd(), 'scripts/prepare-release-artifacts.ts');

    await expect(
      execFile(
        'pnpm',
        [
          'exec',
          'tsx',
          scriptPath,
          '--version',
          '0.2.16',
          '--channel',
          'stable',
          '--base-url',
          'https://download.moryflow.com',
          '--input-dir',
          inputDir,
          '--output-dir',
          outputDir,
        ],
        { cwd: process.cwd() }
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        `Artifact path is not a directory: ${path.join(inputDir, 'darwin-x64')}`
      ),
    });
  });

  it('supports publishing only the configured macOS targets', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prepare-release-artifacts-'));
    tempDirs.push(tempDir);

    const inputDir = path.join(tempDir, 'input');
    const outputDir = path.join(tempDir, 'output');
    await fs.mkdir(inputDir, { recursive: true });

    await writeTargetBundle(
      inputDir,
      'darwin-arm64',
      'latest-mac.yml',
      'MoryFlow-0.2.16-arm64.dmg'
    );
    await writeTargetBundle(inputDir, 'darwin-x64', 'latest-mac.yml', 'MoryFlow-0.2.16-x64.dmg');

    const scriptPath = path.resolve(process.cwd(), 'scripts/prepare-release-artifacts.ts');

    const { stdout } = await execFile(
      'pnpm',
      [
        'exec',
        'tsx',
        scriptPath,
        '--version',
        '0.2.16',
        '--channel',
        'stable',
        '--base-url',
        'https://download.moryflow.com',
        '--input-dir',
        inputDir,
        '--output-dir',
        outputDir,
        '--targets',
        'darwin-arm64,darwin-x64',
      ],
      { cwd: process.cwd() }
    );

    expect(stdout).toContain('"targets": [');

    const manifestRaw = await fs.readFile(
      path.join(outputDir, 'channels', 'stable', 'manifest.json'),
      'utf8'
    );
    const manifest = JSON.parse(manifestRaw) as {
      downloads: Record<string, { feedUrl: string; directUrl: string }>;
    };

    expect(Object.keys(manifest.downloads)).toEqual(['darwin-arm64', 'darwin-x64']);
    expect(manifest.downloads['win32-x64']).toBeUndefined();
  });

  it('lets smoke-check validate a macOS-only release bundle', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prepare-release-artifacts-'));
    tempDirs.push(tempDir);

    const inputDir = path.join(tempDir, 'input');
    const outputDir = path.join(tempDir, 'output');
    await fs.mkdir(inputDir, { recursive: true });

    await writeTargetBundle(
      inputDir,
      'darwin-arm64',
      'latest-mac.yml',
      'MoryFlow-0.2.16-arm64.dmg'
    );
    await writeTargetBundle(inputDir, 'darwin-x64', 'latest-mac.yml', 'MoryFlow-0.2.16-x64.dmg');

    const prepareScriptPath = path.resolve(process.cwd(), 'scripts/prepare-release-artifacts.ts');
    const smokeScriptPath = path.resolve(process.cwd(), 'scripts/smoke-check-update-feed.ts');

    await execFile(
      'pnpm',
      [
        'exec',
        'tsx',
        prepareScriptPath,
        '--version',
        '0.2.16',
        '--channel',
        'stable',
        '--base-url',
        'https://download.moryflow.com',
        '--input-dir',
        inputDir,
        '--output-dir',
        outputDir,
        '--targets',
        'darwin-arm64,darwin-x64',
      ],
      { cwd: process.cwd() }
    );

    const { stdout } = await execFile(
      'pnpm',
      [
        'exec',
        'tsx',
        smokeScriptPath,
        '--version',
        '0.2.16',
        '--channel',
        'stable',
        '--base-url',
        'https://download.moryflow.com',
        '--input-dir',
        outputDir,
        '--targets',
        'darwin-arm64,darwin-x64',
      ],
      { cwd: process.cwd() }
    );

    expect(stdout).toContain('"status": "ok"');
  });

  it('supports beta channel feed filenames for macOS targets', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prepare-release-artifacts-'));
    tempDirs.push(tempDir);

    const inputDir = path.join(tempDir, 'input');
    const outputDir = path.join(tempDir, 'output');
    await fs.mkdir(inputDir, { recursive: true });

    await writeTargetBundle(inputDir, 'darwin-arm64', 'beta-mac.yml', 'MoryFlow-0.2.17-beta.1-arm64.dmg');
    await writeTargetBundle(inputDir, 'darwin-x64', 'beta-mac.yml', 'MoryFlow-0.2.17-beta.1-x64.dmg');

    const prepareScriptPath = path.resolve(process.cwd(), 'scripts/prepare-release-artifacts.ts');
    const smokeScriptPath = path.resolve(process.cwd(), 'scripts/smoke-check-update-feed.ts');

    const { stdout: prepareStdout } = await execFile(
      'pnpm',
      [
        'exec',
        'tsx',
        prepareScriptPath,
        '--version',
        '0.2.17-beta.1',
        '--channel',
        'beta',
        '--base-url',
        'https://download.moryflow.com',
        '--input-dir',
        inputDir,
        '--output-dir',
        outputDir,
        '--targets',
        'darwin-arm64,darwin-x64',
      ],
      { cwd: process.cwd() }
    );

    expect(prepareStdout).toContain('"channel": "beta"');

    const { stdout: smokeStdout } = await execFile(
      'pnpm',
      [
        'exec',
        'tsx',
        smokeScriptPath,
        '--version',
        '0.2.17-beta.1',
        '--channel',
        'beta',
        '--base-url',
        'https://download.moryflow.com',
        '--input-dir',
        outputDir,
        '--targets',
        'darwin-arm64,darwin-x64',
      ],
      { cwd: process.cwd() }
    );

    expect(smokeStdout).toContain('"status": "ok"');

    const manifestRaw = await fs.readFile(
      path.join(outputDir, 'channels', 'beta', 'manifest.json'),
      'utf8'
    );
    const manifest = JSON.parse(manifestRaw) as {
      downloads: Record<string, { feedUrl: string }>;
    };

    expect(manifest.downloads['darwin-arm64']?.feedUrl).toContain('/channels/beta/darwin/arm64/beta-mac.yml');
    expect(manifest.downloads['darwin-x64']?.feedUrl).toContain('/channels/beta/darwin/x64/beta-mac.yml');
  });
});
