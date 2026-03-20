import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pcAppDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
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
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    expect(packageJson.devDependencies?.['@electron/asar']).toBe('^3.4.1');
    expect(packageJson.dependencies?.keytar).toBeUndefined();
    expect(packageJson.scripts?.pack).toBe(
      'pnpm build && node ./scripts/run-electron-builder.cjs --dir'
    );
    expect(packageJson.scripts?.dist).toBe('pnpm build && node ./scripts/run-electron-builder.cjs');
    expect(packageJson.scripts?.['dist:mac']).toBe(
      'pnpm build && node ./scripts/run-electron-builder.cjs --mac'
    );
    expect(packageJson.scripts?.postinstall).toBe(
      'test -n "$CI" || electron-rebuild -f -w better-sqlite3'
    );
    expect(packageJson.scripts?.['posttest:unit']).toBe(
      'test -n "$CI" || electron-rebuild -f -w better-sqlite3'
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
    expect(workflow).toContain('--app-dir "release/${{ needs.metadata.outputs.version }}"');
    expect(workflow).toContain('softprops/action-gh-release');
    expect(workflow).toContain('generate_release_notes: true');
    expect(workflow).not.toContain('mac-arm64/MoryFlow.app');
    expect(workflow).not.toContain('mac-x64/MoryFlow.app');
    // R2 and channel concepts removed
    expect(workflow).not.toContain('download.moryflow.com');
    expect(workflow).not.toContain('R2_BUCKET');
    expect(workflow).not.toContain('publish_channel_feed');
  });

  it('forces local release.sh to run release preflight before commit, tag, and push', async () => {
    const releaseScript = await fs.readFile(path.join(pcAppDir, 'scripts/release.sh'), 'utf8');

    const contractTestCommand = 'pnpm --filter @moryflow/pc exec vitest run';
    const buildCommand = 'CI=1 pnpm --dir apps/moryflow/pc build';

    expect(releaseScript).toContain(contractTestCommand);
    expect(releaseScript).toContain('src/main/app/packaging/release-build-contract.test.ts');
    expect(releaseScript).toContain(
      'src/main/app/packaging/smoke-check-packaged-app-script.test.ts'
    );
    expect(releaseScript).toContain(buildCommand);
    expect(releaseScript.indexOf(contractTestCommand)).toBeLessThan(
      releaseScript.indexOf('git commit -m')
    );
    expect(releaseScript.indexOf(buildCommand)).toBeLessThan(releaseScript.indexOf('git tag -a'));
  });

  it('does not keep production desktop storage on keytar or safeStorage', async () => {
    const telegramSecretStore = await fs.readFile(
      path.join(pcAppDir, 'src/main/channels/telegram/secret-store.ts'),
      'utf8'
    );
    const membershipTokenStore = await fs.readFile(
      path.join(pcAppDir, 'src/main/membership-token-store.ts'),
      'utf8'
    );
    const desktopAdapter = await fs.readFile(
      path.join(pcAppDir, 'src/main/agent-runtime/runtime/desktop-adapter.ts'),
      'utf8'
    );

    expect(telegramSecretStore).not.toContain("import('keytar')");
    expect(membershipTokenStore).not.toContain("import('keytar')");
    expect(desktopAdapter).not.toContain('safeStorage');
  });
});
