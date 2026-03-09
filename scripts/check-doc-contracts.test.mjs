import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildAgentSurface } from './generate-agent-surface.mjs';
import {
  checkDocContracts,
  isGeneratedArtifactPath,
  isPlanWritebackSatisfied,
} from './check-doc-contracts.mjs';

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'moryflow-doc-contracts-'));
  await fn(dir);
}

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'docs', 'plans'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs', 'design', 'moryflow', 'core'), {
    recursive: true,
  });
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(
    path.join(rootDir, 'docs', 'plans', 'feature.md'),
    '# Demo Plan\n\nSee `docs/design/moryflow/core/demo.md`.\n'
  );
  assert.equal(
    isPlanWritebackSatisfied(
      await import('node:fs/promises').then((fs) =>
        fs.readFile(path.join(rootDir, 'docs', 'plans', 'feature.md'), 'utf8')
      )
    ),
    true
  );
});

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'docs', 'plans'), { recursive: true });
  await writeFile(path.join(rootDir, 'docs', 'plans', 'feature.md'), '# Demo Plan\n\nNo refs.\n');
  const result = await checkDocContracts({
    rootDir,
    files: ['docs/plans/feature.md'],
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /docs\/plans\/feature\.md/);
});

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(path.join(rootDir, 'CLAUDE.md'), 'See `apps/demo/entry.ts`.\n');
  await writeFile(path.join(rootDir, 'apps', 'demo', 'entry.ts'), 'export const ok = true;\n');
  const ok = await checkDocContracts({
    rootDir,
    files: ['CLAUDE.md'],
  });
  assert.equal(ok.errors.length, 0);

  const broken = await checkDocContracts({
    rootDir,
    files: ['CLAUDE.md'],
    existsOverride: (targetPath) => targetPath !== path.join(rootDir, 'apps', 'demo', 'entry.ts'),
  });
  assert.equal(broken.errors.length, 1);
  assert.match(broken.errors[0], /entry\.ts/);
});

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'generated'), { recursive: true });
  const result = await checkDocContracts({
    rootDir,
    files: ['generated/runtime.json', 'apps/moryflow/www/routeTree.gen.ts'],
  });
  assert.equal(result.errors.length, 2);
  assert.equal(isGeneratedArtifactPath('generated/runtime.json'), true);
  assert.equal(isGeneratedArtifactPath('apps/moryflow/www/routeTree.gen.ts'), true);
});

await withTempDir(async (rootDir) => {
  const claudeDir = path.join(rootDir, 'apps', 'tiny');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(path.join(claudeDir, 'CLAUDE.md'), '# local\n');
  for (let index = 0; index < 5; index += 1) {
    await writeFile(
      path.join(claudeDir, `file-${index}.ts`),
      `export const value${index} = ${index};\n`
    );
  }
  const result = await checkDocContracts({
    rootDir,
    files: ['apps/tiny/CLAUDE.md'],
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /文件数 <= 10/);
});

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'apps', 'moryflow', 'pc'), { recursive: true });
  await mkdir(path.join(rootDir, 'apps', 'moryflow', 'mobile'), { recursive: true });
  await mkdir(path.join(rootDir, 'apps', 'moryflow', 'server'), { recursive: true });
  await mkdir(path.join(rootDir, 'apps', 'moryflow', 'www'), { recursive: true });
  await mkdir(path.join(rootDir, 'packages', 'agents-runtime'), { recursive: true });
  await mkdir(path.join(rootDir, 'packages', 'agents-tools'), { recursive: true });
  await mkdir(path.join(rootDir, 'packages', 'model-bank'), { recursive: true });
  await mkdir(path.join(rootDir, 'packages', 'ui'), { recursive: true });
  await writeFile(
    path.join(rootDir, 'apps', 'moryflow', 'pc', 'package.json'),
    JSON.stringify({ name: '@moryflow/pc' })
  );
  await writeFile(
    path.join(rootDir, 'apps', 'moryflow', 'mobile', 'package.json'),
    JSON.stringify({ name: '@moryflow/mobile' })
  );
  await writeFile(
    path.join(rootDir, 'apps', 'moryflow', 'server', 'package.json'),
    JSON.stringify({ name: '@moryflow/server' })
  );
  await writeFile(
    path.join(rootDir, 'apps', 'moryflow', 'www', 'package.json'),
    JSON.stringify({ name: '@moryflow/www' })
  );

  const manifest = await buildAgentSurface({ rootDir });
  assert.equal(manifest.platforms.length, 4);
  assert.equal(manifest.sharedPackages.length, 4);
  assert.equal(
    manifest.longLivedFacts.some(
      (item) => item.path === 'docs/design/moryflow/core/harness-engineering-baseline.md'
    ),
    true
  );
});

console.log('check-doc-contracts.test.mjs ok');
