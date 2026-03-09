import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildAgentSurface } from './generate-agent-surface.mjs';
import {
  checkDocContracts,
  isAllowedGeneratedOutput,
  isGeneratedArtifactPath,
  isPlanWritebackSatisfied,
  listCommittedDiffFiles,
  listFilesForValidation,
} from './check-doc-contracts.mjs';

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'moryflow-doc-contracts-'));
  await fn(dir);
}

const git = (rootDir, ...args) =>
  execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();

const initGitRepo = async (rootDir) => {
  git(rootDir, 'init', '--initial-branch=main');
  git(rootDir, 'config', 'user.name', 'Codex');
  git(rootDir, 'config', 'user.email', 'codex@example.com');
};

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
  await writeFile(
    path.join(rootDir, 'CLAUDE.md'),
    '`index.md` 只做导航，`main.ts` 不是这里的入口。\n'
  );
  const result = await checkDocContracts({
    rootDir,
    files: ['CLAUDE.md'],
  });
  assert.equal(result.errors.length, 0);
});

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'apps', 'demo', 'src', 'memox'), { recursive: true });
  await writeFile(path.join(rootDir, 'apps', 'demo', 'src', 'memox', 'CLAUDE.md'), '# memox\n');
  for (let index = 0; index < 12; index += 1) {
    await writeFile(
      path.join(rootDir, 'apps', 'demo', `file-${index}.ts`),
      `export const value${index} = ${index};\n`
    );
  }
  await writeFile(path.join(rootDir, 'apps', 'demo', 'CLAUDE.md'), 'See `src/memox/CLAUDE.md`.\n');
  const ok = await checkDocContracts({
    rootDir,
    files: ['apps/demo/CLAUDE.md'],
  });
  assert.equal(ok.errors.length, 0);

  const broken = await checkDocContracts({
    rootDir,
    files: ['apps/demo/CLAUDE.md'],
    existsOverride: (targetPath) =>
      targetPath !== path.join(rootDir, 'apps', 'demo', 'src', 'memox', 'CLAUDE.md'),
  });
  assert.equal(broken.errors.length, 1);
  assert.match(broken.errors[0], /src\/memox\/CLAUDE\.md/);
});

await withTempDir(async (rootDir) => {
  await mkdir(path.join(rootDir, 'generated'), { recursive: true });
  const result = await checkDocContracts({
    rootDir,
    files: [
      'generated/runtime.json',
      'apps/moryflow/www/routeTree.gen.ts',
      'generated/harness/agent-surface.json',
    ],
  });
  assert.equal(result.errors.length, 2);
  assert.equal(isGeneratedArtifactPath('generated/runtime.json'), true);
  assert.equal(isGeneratedArtifactPath('apps/moryflow/www/routeTree.gen.ts'), true);
  assert.equal(isAllowedGeneratedOutput('generated/harness/agent-surface.json'), true);
});

await withTempDir(async (rootDir) => {
  await initGitRepo(rootDir);
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(path.join(rootDir, 'CLAUDE.md'), 'See `apps/demo/entry.ts`.\n');
  await writeFile(path.join(rootDir, 'apps', 'demo', 'entry.ts'), 'export const ok = true;\n');
  git(rootDir, 'add', '.');
  git(rootDir, 'commit', '-m', 'init');

  git(rootDir, 'checkout', '-b', 'feature');
  await rm(path.join(rootDir, 'apps', 'demo', 'entry.ts'));
  git(rootDir, 'add', '-A');
  git(rootDir, 'commit', '-m', 'delete entry');

  const files = await listFilesForValidation(rootDir, 'main');
  assert.equal(files.includes('CLAUDE.md'), true);

  const result = await checkDocContracts({
    rootDir,
    compareBaseRef: 'main',
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /entry\.ts/);
});

await withTempDir(async (rootDir) => {
  await initGitRepo(rootDir);
  await mkdir(path.join(rootDir, 'generated', 'harness'), { recursive: true });
  await mkdir(path.join(rootDir, 'generated'), { recursive: true });
  await writeFile(path.join(rootDir, 'generated', 'runtime.json'), '{"version":1}\n');
  git(rootDir, 'add', '.');
  git(rootDir, 'commit', '-m', 'init');

  git(rootDir, 'checkout', '-b', 'feature');
  await writeFile(path.join(rootDir, 'generated', 'runtime.json'), '{"version":2}\n');
  git(rootDir, 'add', 'generated/runtime.json');
  git(rootDir, 'commit', '-m', 'touch generated');

  const committedDiffFiles = listCommittedDiffFiles(rootDir, 'main');
  assert.equal(committedDiffFiles.includes('generated/runtime.json'), true);

  const result = await checkDocContracts({
    rootDir,
    compareBaseRef: 'main',
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /generated\/runtime\.json/);
});

await withTempDir(async (rootDir) => {
  await initGitRepo(rootDir);
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(path.join(rootDir, 'CLAUDE.md'), 'See `apps/demo/entry.ts`.\n');
  await writeFile(path.join(rootDir, 'apps', 'demo', 'entry.ts'), 'export const ok = true;\n');
  git(rootDir, 'add', '.');
  git(rootDir, 'commit', '-m', 'init');

  git(rootDir, 'checkout', '-b', 'feature');
  await rm(path.join(rootDir, 'apps', 'demo', 'entry.ts'));
  git(rootDir, 'add', '-A');
  git(rootDir, 'commit', '-m', 'delete entry');

  await mkdir(path.join(rootDir, 'tmpdir'), { recursive: true });
  await writeFile(path.join(rootDir, 'tmpdir', 'note.txt'), 'local only\n');

  const files = await listFilesForValidation(rootDir, 'main');
  assert.equal(files.includes('apps/demo/entry.ts'), true);
  assert.equal(files.includes('CLAUDE.md'), true);

  const result = await checkDocContracts({
    rootDir,
    compareBaseRef: 'main',
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /entry\.ts/);
});

await withTempDir(async (rootDir) => {
  await initGitRepo(rootDir);
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(path.join(rootDir, 'CLAUDE.md'), 'See `apps/demo/missing.ts`.\n');
  git(rootDir, 'add', '.');
  git(rootDir, 'commit', '-m', 'init');

  git(rootDir, 'checkout', '-b', 'feature');

  const result = await checkDocContracts({
    rootDir,
    compareBaseRef: 'origin/main',
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /无法解析 compare base：origin\/main/);
});

await withTempDir(async (rootDir) => {
  await initGitRepo(rootDir);
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(path.join(rootDir, 'CLAUDE.md'), 'See `apps/demo/missing.ts`.\n');
  git(rootDir, 'add', '.');
  git(rootDir, 'commit', '-m', 'init');

  git(rootDir, 'checkout', '-b', 'feature');
  await writeFile(path.join(rootDir, 'tmp-note.txt'), 'dirty local file\n');

  const result = await checkDocContracts({
    rootDir,
    compareBaseRef: 'origin/main',
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /无法解析 compare base：origin\/main/);
});

await withTempDir(async (rootDir) => {
  await initGitRepo(rootDir);
  await mkdir(path.join(rootDir, 'apps', 'demo'), { recursive: true });
  await writeFile(path.join(rootDir, 'CLAUDE.md'), 'See `apps/demo/old-entry.ts`.\n');
  await writeFile(path.join(rootDir, 'apps', 'demo', 'old-entry.ts'), 'export const ok = true;\n');
  git(rootDir, 'add', '.');
  git(rootDir, 'commit', '-m', 'init');

  git(rootDir, 'checkout', '-b', 'feature');
  git(rootDir, 'mv', 'apps/demo/old-entry.ts', 'apps/demo/new-entry.ts');
  git(rootDir, 'commit', '-am', 'rename entry');

  const committedDiffFiles = listCommittedDiffFiles(rootDir, 'main');
  assert.equal(committedDiffFiles.includes('apps/demo/old-entry.ts'), true);
  assert.equal(committedDiffFiles.includes('apps/demo/new-entry.ts'), true);

  const files = await listFilesForValidation(rootDir, 'main');
  assert.equal(files.includes('CLAUDE.md'), true);

  const result = await checkDocContracts({
    rootDir,
    compareBaseRef: 'main',
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /old-entry\.ts/);
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
  await writeFile(
    path.join(rootDir, 'packages', 'agents-runtime', 'package.json'),
    JSON.stringify({ name: '@moryflow/agents-runtime' })
  );
  await writeFile(
    path.join(rootDir, 'packages', 'agents-tools', 'package.json'),
    JSON.stringify({ name: '@moryflow/agents-tools' })
  );
  await writeFile(
    path.join(rootDir, 'packages', 'model-bank', 'package.json'),
    JSON.stringify({ name: '@moryflow/model-bank' })
  );
  await writeFile(
    path.join(rootDir, 'packages', 'ui', 'package.json'),
    JSON.stringify({ name: '@moryflow/ui' })
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
  await writeFile(
    path.join(rootDir, 'packages', 'agents-runtime', 'package.json'),
    JSON.stringify({ name: '@moryflow/agents-runtime' })
  );
  await writeFile(
    path.join(rootDir, 'packages', 'agents-tools', 'package.json'),
    JSON.stringify({ name: '@moryflow/agents-tools' })
  );
  await writeFile(
    path.join(rootDir, 'packages', 'model-bank', 'package.json'),
    JSON.stringify({ name: '@moryflow/model-bank' })
  );

  await assert.rejects(
    buildAgentSurface({ rootDir }),
    /缺少 package\.json 或 name 字段无效：packages\/ui\/package\.json/
  );
});

console.log('check-doc-contracts.test.mjs ok');
