import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const scriptPath = path.join(process.cwd(), 'scripts', 'generate-agent-surface.mjs');

async function withTempProject(run) {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'moryflow-generate-agent-surface-'));
  try {
    await mkdir(path.join(rootDir, 'apps', 'moryflow', 'pc'), { recursive: true });
    await mkdir(path.join(rootDir, 'apps', 'moryflow', 'mobile'), { recursive: true });
    await mkdir(path.join(rootDir, 'apps', 'moryflow', 'server'), { recursive: true });
    await mkdir(path.join(rootDir, 'apps', 'moryflow', 'www'), { recursive: true });
    await mkdir(path.join(rootDir, 'packages', 'agents-runtime'), { recursive: true });
    await mkdir(path.join(rootDir, 'packages', 'agents-tools'), { recursive: true });
    await mkdir(path.join(rootDir, 'packages', 'model-bank'), { recursive: true });
    await mkdir(path.join(rootDir, 'packages', 'ui'), { recursive: true });

    const packageEntries = [
      ['apps/moryflow/pc/package.json', '@moryflow/pc'],
      ['apps/moryflow/mobile/package.json', '@moryflow/mobile'],
      ['apps/moryflow/server/package.json', '@moryflow/server'],
      ['apps/moryflow/www/package.json', '@moryflow/www'],
      ['packages/agents-runtime/package.json', '@moryflow/agents-runtime'],
      ['packages/agents-tools/package.json', '@moryflow/agents-tools'],
      ['packages/model-bank/package.json', '@moryflow/model-bank'],
      ['packages/ui/package.json', '@moryflow/ui'],
    ];

    for (const [relativePath, name] of packageEntries) {
      await writeFile(path.join(rootDir, relativePath), JSON.stringify({ name }));
    }

    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

await withTempProject(async (rootDir) => {
  const manifestPath = path.join(rootDir, 'generated', 'harness', 'agent-surface.json');
  execFileSync('node', [scriptPath], { cwd: rootDir, encoding: 'utf8' });
  const first = await readFile(manifestPath, 'utf8');
  await writeFile(manifestPath, '{"version":0}\n');

  const check = spawnSync('node', [scriptPath, '--check'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  assert.equal(check.status, 1);
  assert.match(check.stderr, /agent-surface\.json 已过期/);

  const afterCheck = await readFile(manifestPath, 'utf8');
  assert.equal(afterCheck, '{"version":0}\n');

  execFileSync('node', [scriptPath], { cwd: rootDir, encoding: 'utf8' });
  const second = await readFile(manifestPath, 'utf8');
  assert.equal(second, first);

  const cleanCheck = spawnSync('node', [scriptPath, '--check'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  assert.equal(cleanCheck.status, 0, cleanCheck.stderr);
});

console.log('generate-agent-surface.test.mjs ok');
