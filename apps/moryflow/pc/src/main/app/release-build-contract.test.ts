import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pcAppDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const repoRoot = path.resolve(pcAppDir, '../../..');

describe('desktop release build contract', () => {
  it('prebuilds shared workspace packages before electron-vite build', async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(pcAppDir, 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.prebuild).toBe('pnpm -w run build:packages');
    expect(packageJson.scripts?.build).toBe('electron-vite build');
  });

  it('routes packaging through the isolated electron-builder wrapper', async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(pcAppDir, 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.pack).toBe(
      'pnpm build && node ./scripts/run-electron-builder.cjs --dir'
    );
    expect(packageJson.scripts?.dist).toBe('pnpm build && node ./scripts/run-electron-builder.cjs');
    expect(packageJson.scripts?.['dist:mac']).toBe(
      'pnpm build && node ./scripts/run-electron-builder.cjs --mac'
    );
  });

  it('does not rely on the partial --if-present workspace build path in release workflow', async () => {
    const workflow = await fs.readFile(
      path.join(repoRoot, '.github/workflows/release-pc.yml'),
      'utf8'
    );

    expect(workflow).toContain('pnpm --dir apps/moryflow/pc build');
    expect(workflow).toContain(
      'pnpm --dir apps/moryflow/pc exec node ./scripts/run-electron-builder.cjs --mac dmg zip --arm64 --publish never'
    );
    expect(workflow).toContain(
      'pnpm --dir apps/moryflow/pc exec node ./scripts/run-electron-builder.cjs --mac dmg zip --x64 --publish never'
    );
    expect(workflow).not.toContain(
      'pnpm --filter "@moryflow/pc..." --filter "!@moryflow/pc" --if-present build'
    );
  });
});
