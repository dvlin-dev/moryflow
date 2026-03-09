import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzePlanDrift, extractDocPaths, classifyPlanDrift } from './check-plan-drift.mjs';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'check-plan-drift-'));
const scriptPath = fileURLToPath(new URL('./check-plan-drift.mjs', import.meta.url));

async function withTempProject(run) {
  const rootDir = path.join(tempRoot, Math.random().toString(36).slice(2));
  await mkdir(rootDir, { recursive: true });
  await mkdir(path.join(rootDir, 'docs/plans'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs/design/moryflow/core'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs/reference'), { recursive: true });

  try {
    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

await withTempProject(async (rootDir) => {
  const content = `
请参考 [基线](docs/design/moryflow/core/harness-engineering-baseline.md)
以及 \`docs/reference/testing-and-validation.md\`
`;
  const paths = extractDocPaths(content);
  assert.deepEqual(paths.sort(), [
    'docs/design/moryflow/core/harness-engineering-baseline.md',
    'docs/reference/testing-and-validation.md',
  ]);
});

await withTempProject(async (rootDir) => {
  const planPath = 'docs/plans/relative-plan.md';
  const content = `
请参考 [基线](../design/moryflow/core/harness-engineering-baseline.md)
以及 \`../reference/testing-and-validation.md\`
`;
  const paths = extractDocPaths(content, { sourceFile: planPath });
  assert.deepEqual(paths.sort(), [
    'docs/design/moryflow/core/harness-engineering-baseline.md',
    'docs/reference/testing-and-validation.md',
  ]);
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/plans/keep-plan.md'),
    `# 保留计划\n\n## 任务\n\n1. 实现脚本\n2. 跑验证\n`
  );

  const result = await analyzePlanDrift({ rootDir });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].classification, 'keep');
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/design/moryflow/core/runtime-baseline.md'),
    '# Runtime 基线\n\n## 当前状态\n\n当前实现已经冻结。\n'
  );
  await writeFile(
    path.join(rootDir, 'docs/plans/rewrite-plan.md'),
    `# 运行时计划\n\n## 当前状态\n\n当前实现已经冻结。\n\n参考 [长期文档](docs/design/moryflow/core/runtime-baseline.md)\n`
  );

  const result = await analyzePlanDrift({ rootDir });
  assert.equal(result.results[0].classification, 'rewrite-to-design');
  assert.ok(
    result.results[0].reasons.some(
      (reason) => reason.includes('稳定事实') || reason.includes('回写')
    )
  );
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/design/moryflow/core/runtime-baseline.md'),
    '# Runtime 基线\n\n## 当前状态\n\n当前实现已经冻结。\n'
  );
  await writeFile(
    path.join(rootDir, 'docs/plans/bold-state-plan.md'),
    '# 运行时计划\n\n**当前状态**\n\n当前实现已经冻结。\n\n参考 [长期文档](../design/moryflow/core/runtime-baseline.md)\n'
  );

  const result = await analyzePlanDrift({ rootDir });
  assert.equal(result.results[0].classification, 'rewrite-to-design');
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/plans/delete-plan.md'),
    `# 失效计划\n\n参考 [不存在文档](../design/moryflow/core/missing.md)\n`
  );

  const result = await analyzePlanDrift({ rootDir });
  assert.equal(result.results[0].classification, 'delete');
  assert.ok(result.results[0].missingReferences.includes('docs/design/moryflow/core/missing.md'));
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/design/moryflow/core/runtime-baseline.md'),
    '# Runtime 基线\n\n## 当前状态\n\n系统已经冻结为 Remote Agents。\n'
  );
  await writeFile(
    path.join(rootDir, 'docs/plans/conflict-plan.md'),
    `# 旧计划\n\n## 当前状态\n\n系统当前仍是 Agent 页面。\n\n参考 [长期文档](docs/design/moryflow/core/runtime-baseline.md)\n`
  );

  const result = await analyzePlanDrift({ rootDir });
  assert.equal(result.results[0].classification, 'rewrite-to-design');
  assert.ok(result.results[0].reasons.some((reason) => reason.includes('冲突')));
});

await withTempProject(async (rootDir) => {
  const keep = classifyPlanDrift({
    planPath: 'docs/plans/keep.md',
    content: '# keep',
    missingReferences: [],
    stableDocPaths: [],
    conflictingStableDocs: [],
  });
  assert.equal(keep.classification, 'keep');
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/design/moryflow/core/runtime-baseline.md'),
    '# Runtime 基线\n\n## 当前状态\n\n当前实现已经冻结。\n'
  );
  await writeFile(
    path.join(rootDir, 'docs/plans/rewrite-cli-plan.md'),
    `# 运行时计划\n\n## 当前状态\n\n当前实现已经冻结。\n\n参考 [长期文档](../design/moryflow/core/runtime-baseline.md)\n`
  );
  const cli = spawnSync('node', [scriptPath], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  assert.equal(cli.status, 1);
  assert.match(cli.stdout, /rewrite-to-design/);
});

await withTempProject(async (rootDir) => {
  await writeFile(
    path.join(rootDir, 'docs/plans/delete-cli-plan.md'),
    `# 失效计划\n\n参考 [不存在文档](../design/moryflow/core/missing.md)\n`
  );
  const cli = spawnSync('node', [scriptPath], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  assert.equal(cli.status, 1);
  assert.match(cli.stdout, /delete/);
});

console.log('check-plan-drift tests passed');
