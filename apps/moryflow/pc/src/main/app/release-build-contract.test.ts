import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pcAppDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const repoRoot = path.resolve(pcAppDir, '../../..');

describe('desktop release build contract', () => {
  it('pins @openai/agents for agents-runtime so electron packaging does not drop the peer dependency', async () => {
    const runtimePackageJson = JSON.parse(
      await fs.readFile(path.join(repoRoot, 'packages/agents-runtime/package.json'), 'utf8')
    ) as {
      dependencies?: Record<string, string>;
    };

    expect(runtimePackageJson.dependencies?.['@openai/agents']).toBe('0.4.3');
  });

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
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    expect(packageJson.devDependencies?.['@electron/asar']).toBe('^3.4.1');
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

  it('requires tag-based manual release reruns and packaged-app smoke gates in the release workflow', async () => {
    const workflow = await fs.readFile(
      path.join(repoRoot, '.github/workflows/release-pc.yml'),
      'utf8'
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('inputs:');
    expect(workflow).toContain('tag:');
    expect(workflow).toContain('ref: ${{ needs.metadata.outputs.tag }}');
    expect(workflow).toContain(
      'pnpm --dir apps/moryflow/pc exec tsx scripts/smoke-check-packaged-app.ts'
    );
  });

  it('forces local release.sh to run release preflight before commit, tag, and push', async () => {
    const releaseScript = await fs.readFile(path.join(pcAppDir, 'scripts/release.sh'), 'utf8');

    const contractTestCommand = 'pnpm --filter @moryflow/pc exec vitest run';
    const buildCommand = 'CI=1 pnpm --dir apps/moryflow/pc build';

    expect(releaseScript).toContain(contractTestCommand);
    expect(releaseScript).toContain('src/main/app/release-build-contract.test.ts');
    expect(releaseScript).toContain('src/main/app/smoke-check-packaged-app-script.test.ts');
    expect(releaseScript).toContain(buildCommand);
    expect(releaseScript.indexOf(contractTestCommand)).toBeLessThan(
      releaseScript.indexOf('git commit -m')
    );
    expect(releaseScript.indexOf(buildCommand)).toBeLessThan(releaseScript.indexOf('git tag -a'));
  });
});
