import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getStagedFiles,
  shouldSkipPrecommitTypecheck,
} from './should-skip-precommit-typecheck.mjs';

const WORKSPACE_ROOTS = ['apps', 'packages', 'tooling'];
const FULL_RUN_FILES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsc-multi.stage1.json',
  'tsc-multi.stage2.json',
]);
const FULL_RUN_PREFIXES = ['.github/', 'tooling/'];
const SCRIPT_TEST_PREFIXES = ['.husky/', 'scripts/'];
const DOC_FILE_PATTERN = /\.(md|mdx)$/i;

export function collectWorkspacePackages(rootDir) {
  const packages = [];

  const walk = (relativeDir) => {
    const absoluteDir = path.join(rootDir, relativeDir);
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    const hasPackageJson = entries.some((entry) => entry.isFile() && entry.name === 'package.json');

    if (hasPackageJson) {
      const packageJsonPath = path.join(absoluteDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name && packageJson.scripts?.['test:unit']) {
        packages.push({
          name: packageJson.name,
          dir: relativeDir.split(path.sep).join('/'),
        });
      }
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.turbo') {
        continue;
      }
      walk(path.join(relativeDir, entry.name));
    }
  };

  for (const workspaceRoot of WORKSPACE_ROOTS) {
    const workspaceRootPath = path.join(rootDir, workspaceRoot);
    if (!fs.existsSync(workspaceRootPath)) {
      continue;
    }
    walk(workspaceRoot);
  }

  return packages.sort((left, right) => left.dir.localeCompare(right.dir));
}

export function findClosestWorkspacePackage(filePath, packages) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  let matchedPackage = null;

  for (const workspacePackage of packages) {
    const packagePrefix = `${workspacePackage.dir}/`;
    if (normalizedPath === workspacePackage.dir || normalizedPath.startsWith(packagePrefix)) {
      if (!matchedPackage || workspacePackage.dir.length > matchedPackage.dir.length) {
        matchedPackage = workspacePackage;
      }
    }
  }

  return matchedPackage;
}

function needsFullRun(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (FULL_RUN_FILES.has(normalizedPath)) {
    return true;
  }

  return FULL_RUN_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function needsScriptTests(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return SCRIPT_TEST_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function isDocFile(filePath) {
  return DOC_FILE_PATTERN.test(filePath);
}

export function collectScriptTests(rootDir) {
  const scriptsDir = path.join(rootDir, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    return [];
  }

  return fs
    .readdirSync(scriptsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map((entry) => path.posix.join('scripts', entry.name))
    .sort();
}

function createWorkspaceUnitTestPlan(stagedFiles, packages) {
  if (stagedFiles.length === 0) {
    return null;
  }

  if (stagedFiles.some(needsFullRun)) {
    return { mode: 'full', reason: 'root or shared tooling changes detected' };
  }

  const filters = new Set();

  for (const filePath of stagedFiles) {
    const workspacePackage = findClosestWorkspacePackage(filePath, packages);
    if (!workspacePackage) {
      return { mode: 'full', reason: `no scoped unit-test package for ${filePath}` };
    }

    if (workspacePackage.dir.startsWith('packages/')) {
      filters.add(`...${workspacePackage.name}`);
      continue;
    }

    filters.add(workspacePackage.name);
  }

  if (filters.size === 0) {
    return { mode: 'full', reason: 'no scoped package filters resolved' };
  }

  return {
    mode: 'scoped',
    reason: 'scoped to staged workspace packages',
    filters: [...filters].sort(),
  };
}

export function createPrecommitUnitTestPlan(stagedFiles, packages, scriptTests = []) {
  if (stagedFiles.length === 0) {
    return { mode: 'full', reason: 'empty staged file list' };
  }

  if (shouldSkipPrecommitTypecheck(stagedFiles)) {
    return { mode: 'skip', reason: 'docs-only staged changes' };
  }

  const steps = [];
  const workspaceFiles = stagedFiles.filter(
    (filePath) => !needsScriptTests(filePath) && !isDocFile(filePath)
  );

  if (stagedFiles.some(needsScriptTests)) {
    if (scriptTests.length === 0 && workspaceFiles.length === 0) {
      return { mode: 'skip', reason: 'no script tests available' };
    }

    if (scriptTests.length > 0) {
      steps.push({
        mode: 'script-tests',
        reason: 'repo script or hook changes detected',
        scriptTests,
      });
    }
  }

  const workspacePlan = createWorkspaceUnitTestPlan(workspaceFiles, packages);
  if (workspacePlan) {
    steps.push(workspacePlan);
  }

  if (steps.length === 0) {
    return { mode: 'skip', reason: 'no unit tests selected' };
  }

  if (steps.length === 1) {
    return steps[0];
  }

  return {
    mode: 'multi',
    reason: 'repo script changes detected alongside workspace changes',
    steps,
  };
}

export function buildPrecommitUnitTestCommands(plan) {
  if (plan.mode === 'skip') {
    return [];
  }

  if (plan.mode === 'multi') {
    return plan.steps.flatMap((step) => buildPrecommitUnitTestCommands(step));
  }

  if (plan.mode === 'script-tests') {
    return [
      {
        command: 'node',
        args: ['--test', ...plan.scriptTests],
      },
    ];
  }

  const args = ['turbo', 'run', 'test:unit', '--concurrency=4'];
  if (plan.mode === 'scoped') {
    for (const filter of plan.filters) {
      args.push(`--filter=${filter}`);
    }
  }

  return [
    {
      command: 'pnpm',
      args,
    },
  ];
}

export function buildPrecommitUnitTestCommand(plan) {
  const commands = buildPrecommitUnitTestCommands(plan);
  if (commands.length === 0) {
    return null;
  }

  if (commands.length === 1) {
    return commands[0];
  }

  return commands;
}

function logPlanStep(plan) {
  if (plan.mode === 'script-tests') {
    console.log(
      `[pre-commit:test:unit] running repo script tests for ${plan.scriptTests.join(', ')}`
    );
    return;
  }

  if (plan.mode === 'scoped') {
    console.log(`[pre-commit:test:unit] running scoped unit tests for ${plan.filters.join(', ')}`);
    return;
  }

  console.log(`[pre-commit:test:unit] running full unit tests: ${plan.reason}`);
}

export function runPrecommitUnitTests({
  cwd = process.cwd(),
  stagedFiles = getStagedFiles(),
  packages = collectWorkspacePackages(cwd),
  scriptTests = collectScriptTests(cwd),
} = {}) {
  const plan = createPrecommitUnitTestPlan(stagedFiles, packages, scriptTests);
  const commands = buildPrecommitUnitTestCommands(plan);

  if (plan.mode === 'skip') {
    console.log('[pre-commit:test:unit] docs-only staged changes: skip unit tests');
    return 0;
  }

  if (plan.mode === 'multi') {
    for (const step of plan.steps) {
      logPlanStep(step);
    }
  } else {
    logPlanStep(plan);
  }

  for (const command of commands) {
    const result = spawnSync(command.command, command.args, {
      cwd,
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      return typeof result.status === 'number' ? result.status : 1;
    }
  }

  return 0;
}

const isEntrypoint =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  process.exit(runPrecommitUnitTests());
}
