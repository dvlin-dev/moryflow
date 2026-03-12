import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPrecommitUnitTestCommand,
  buildPrecommitUnitTestCommands,
  createPrecommitUnitTestPlan,
  findClosestWorkspacePackage,
  runPrecommitUnitTests,
} from './run-precommit-unit-tests.mjs';

const packages = [
  { name: '@moryflow/ui', dir: 'packages/ui' },
  { name: '@moryflow/pc', dir: 'apps/moryflow/pc' },
  { name: '@anyhunt/console', dir: 'apps/anyhunt/console' },
];
const scriptTests = [
  'scripts/run-precommit-unit-tests.test.mjs',
  'scripts/should-skip-precommit-typecheck.test.mjs',
];

test('docs-only staged changes skip unit tests', () => {
  const plan = createPrecommitUnitTestPlan(['docs/index.md', 'CLAUDE.md'], packages, scriptTests);
  assert.deepEqual(plan, {
    mode: 'skip',
    reason: 'docs-only staged changes',
  });
});

test('shared package changes run package and dependents', () => {
  const plan = createPrecommitUnitTestPlan(['packages/ui/src/ai/tool.tsx'], packages, scriptTests);
  assert.deepEqual(plan, {
    mode: 'scoped',
    reason: 'scoped to staged workspace packages',
    filters: ['...@moryflow/ui'],
  });
});

test('app package changes run scoped package tests', () => {
  const plan = createPrecommitUnitTestPlan(
    ['apps/moryflow/pc/src/main/index.ts'],
    packages,
    scriptTests
  );
  assert.deepEqual(plan, {
    mode: 'scoped',
    reason: 'scoped to staged workspace packages',
    filters: ['@moryflow/pc'],
  });
});

test('root hook and script changes run repo script tests', () => {
  const huskyPlan = createPrecommitUnitTestPlan(['.husky/pre-commit'], packages, scriptTests);
  assert.deepEqual(huskyPlan, {
    mode: 'script-tests',
    reason: 'repo script or hook changes detected',
    scriptTests,
  });

  const scriptPlan = createPrecommitUnitTestPlan(['scripts/prepare.cjs'], packages, scriptTests);
  assert.deepEqual(scriptPlan, {
    mode: 'script-tests',
    reason: 'repo script or hook changes detected',
    scriptTests,
  });
});

test('script and workspace changes run both script tests and scoped unit tests', () => {
  const plan = createPrecommitUnitTestPlan(
    ['.husky/pre-commit', 'apps/moryflow/pc/src/main/index.ts'],
    packages,
    scriptTests
  );
  assert.deepEqual(plan, {
    mode: 'multi',
    reason: 'repo script changes detected alongside workspace changes',
    steps: [
      {
        mode: 'script-tests',
        reason: 'repo script or hook changes detected',
        scriptTests,
      },
      {
        mode: 'scoped',
        reason: 'scoped to staged workspace packages',
        filters: ['@moryflow/pc'],
      },
    ],
  });
});

test('script and root config changes run both script tests and full unit tests', () => {
  const plan = createPrecommitUnitTestPlan(
    ['scripts/prepare.cjs', 'package.json'],
    packages,
    scriptTests
  );
  assert.deepEqual(plan, {
    mode: 'multi',
    reason: 'repo script changes detected alongside workspace changes',
    steps: [
      {
        mode: 'script-tests',
        reason: 'repo script or hook changes detected',
        scriptTests,
      },
      {
        mode: 'full',
        reason: 'root or shared tooling changes detected',
      },
    ],
  });
});

test('markdown files do not force full unit tests when code changes are scoped', () => {
  const plan = createPrecommitUnitTestPlan(
    ['docs/reference/testing-and-validation.md', 'apps/moryflow/pc/src/main/index.ts'],
    packages,
    scriptTests
  );
  assert.deepEqual(plan, {
    mode: 'scoped',
    reason: 'scoped to staged workspace packages',
    filters: ['@moryflow/pc'],
  });
});

test('unknown non-doc files fall back to full unit tests', () => {
  const plan = createPrecommitUnitTestPlan(['README.txt'], packages, scriptTests);
  assert.deepEqual(plan, {
    mode: 'full',
    reason: 'no scoped unit-test package for README.txt',
  });
});

test('duplicate filters are deduplicated and sorted', () => {
  const plan = createPrecommitUnitTestPlan(
    ['packages/ui/src/ai/tool.tsx', 'packages/ui/test/tool-shell-redesign.test.tsx'],
    packages,
    scriptTests
  );
  assert.deepEqual(plan.filters, ['...@moryflow/ui']);
});

test('closest workspace package wins for nested paths', () => {
  const matchedPackage = findClosestWorkspacePackage(
    'apps/moryflow/pc/src/renderer/components/view.tsx',
    packages
  );
  assert.deepEqual(matchedPackage, { name: '@moryflow/pc', dir: 'apps/moryflow/pc' });
});

test('scoped command appends filter flags', () => {
  const command = buildPrecommitUnitTestCommand({
    mode: 'scoped',
    filters: ['...@moryflow/ui', '@moryflow/pc'],
  });
  assert.deepEqual(command, {
    command: 'pnpm',
    args: [
      'turbo',
      'run',
      'test:unit',
      '--concurrency=4',
      '--filter=...@moryflow/ui',
      '--filter=@moryflow/pc',
    ],
  });
});

test('script-test command runs node test files directly', () => {
  const command = buildPrecommitUnitTestCommand({
    mode: 'script-tests',
    scriptTests,
  });
  assert.deepEqual(command, {
    command: 'node',
    args: ['--test', ...scriptTests],
  });
});

test('multi-step command runs script tests before unit tests', () => {
  const commands = buildPrecommitUnitTestCommands({
    mode: 'multi',
    reason: 'repo script changes detected alongside workspace changes',
    steps: [
      {
        mode: 'script-tests',
        reason: 'repo script or hook changes detected',
        scriptTests,
      },
      {
        mode: 'scoped',
        reason: 'scoped to staged workspace packages',
        filters: ['@moryflow/pc'],
      },
    ],
  });
  assert.deepEqual(commands, [
    {
      command: 'node',
      args: ['--test', ...scriptTests],
    },
    {
      command: 'pnpm',
      args: ['turbo', 'run', 'test:unit', '--concurrency=4', '--filter=@moryflow/pc'],
    },
  ]);
});

test('full command runs unfiltered unit tests', () => {
  const command = buildPrecommitUnitTestCommand({
    mode: 'full',
    reason: 'root or shared tooling changes detected',
  });
  assert.deepEqual(command, {
    command: 'pnpm',
    args: ['turbo', 'run', 'test:unit', '--concurrency=4'],
  });
});

test('skip logs the actual skip reason', () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(message);

  try {
    const exitCode = runPrecommitUnitTests({
      stagedFiles: ['.husky/pre-commit'],
      packages,
      scriptTests: [],
    });
    assert.equal(exitCode, 0);
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(logs, ['[pre-commit:test:unit] no script tests available: skip unit tests']);
});
