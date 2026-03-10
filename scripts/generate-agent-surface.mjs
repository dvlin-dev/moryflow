import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_PATH = 'generated/harness/agent-surface.json';

const LONG_LIVED_FACTS = [
  {
    id: 'harness-baseline',
    path: 'docs/design/moryflow/core/harness-engineering-baseline.md',
    role: 'harness-baseline',
  },
  {
    id: 'runtime-control-plane',
    path: 'docs/design/moryflow/core/agent-runtime-control-plane-adr.md',
    role: 'runtime-control-plane',
  },
  {
    id: 'ui-conversation-streaming',
    path: 'docs/design/moryflow/core/ui-conversation-and-streaming.md',
    role: 'conversation-protocol',
  },
  {
    id: 'chat-stream-runtime-refactor',
    path: 'docs/design/moryflow/core/chat-stream-runtime-refactor.md',
    role: 'pc-runtime-baseline',
  },
  {
    id: 'testing-and-validation',
    path: 'docs/reference/testing-and-validation.md',
    role: 'verification-baseline',
  },
];

const SHARED_PACKAGE_PATHS = [
  {
    id: 'agents-runtime',
    path: 'packages/agents-runtime',
    responsibility: 'runtime-control-plane',
  },
  { id: 'agents-tools', path: 'packages/agents-tools', responsibility: 'tool-surface' },
  { id: 'model-bank', path: 'packages/model-bank', responsibility: 'model-registry' },
  { id: 'ui', path: 'packages/ui', responsibility: 'conversation-ui' },
];

const PLATFORM_DEFINITIONS = [
  {
    id: 'pc',
    path: 'apps/moryflow/pc',
    role: 'desktop-runtime-shell',
    abilities: {
      approval: true,
      bash: true,
      subagent: true,
      mcp: true,
      traceUpload: true,
      taskState: true,
    },
  },
  {
    id: 'mobile',
    path: 'apps/moryflow/mobile',
    role: 'mobile-chat-runtime',
    abilities: {
      approval: true,
      bash: false,
      subagent: false,
      mcp: false,
      traceUpload: false,
      taskState: true,
    },
  },
  {
    id: 'server',
    path: 'apps/moryflow/server',
    role: 'trace-storage-and-review',
    abilities: {
      approval: false,
      bash: false,
      subagent: false,
      mcp: false,
      traceUpload: false,
      agentTrace: true,
    },
  },
  {
    id: 'www',
    path: 'apps/moryflow/www',
    role: 'web-surface',
    abilities: {
      approval: false,
      bash: false,
      subagent: false,
      mcp: false,
      traceUpload: false,
      conversationShell: false,
    },
  },
];

const normalizePath = (targetPath, rootDir) =>
  path.relative(rootDir, targetPath).split(path.sep).join('/');

async function readPackageName(rootDir, packagePath) {
  const packageJsonPath = path.join(rootDir, packagePath, 'package.json');
  try {
    const raw = await readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.name !== 'string' || parsed.name.trim().length === 0) {
      throw new Error(
        `缺少 package.json 或 name 字段无效：${normalizePath(packageJsonPath, rootDir)}`
      );
    }
    return parsed.name.trim();
  } catch (error) {
    if (error instanceof Error && error.message.includes('缺少 package.json 或 name 字段无效')) {
      throw error;
    }
    throw new Error(
      `缺少 package.json 或 name 字段无效：${normalizePath(packageJsonPath, rootDir)}`
    );
  }
}

const parseCliOptions = (argv) => ({
  check: argv.includes('--check'),
});

export async function buildAgentSurface({ rootDir = process.cwd() } = {}) {
  const sharedPackages = await Promise.all(
    SHARED_PACKAGE_PATHS.map(async (item) => ({
      ...item,
      packageName: await readPackageName(rootDir, item.path),
    }))
  );

  const platforms = await Promise.all(
    PLATFORM_DEFINITIONS.map(async (item) => ({
      ...item,
      packageName: await readPackageName(rootDir, item.path),
    }))
  );

  return {
    version: 1,
    generatedPath: MANIFEST_PATH,
    longLivedFacts: LONG_LIVED_FACTS,
    sharedPackages,
    platforms,
    runtimeSurface: {
      modes: ['ask', 'full_access'],
      permissionDomains: ['read', 'edit', 'bash', 'web_fetch', 'web_search', 'mcp'],
      tooling: ['task', 'permission', 'compaction', 'doom-loop', 'tool-output'],
      traceMarkers: ['approval', 'compaction', 'doomLoop', 'toolOutput'],
    },
  };
}

async function runCli(options = {}) {
  const rootDir = process.cwd();
  const manifest = await buildAgentSurface({ rootDir });
  const outputPath = path.join(rootDir, MANIFEST_PATH);
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.check) {
    let existing = null;
    try {
      existing = await readFile(outputPath, 'utf8');
    } catch {
      existing = null;
    }
    if (existing !== serialized) {
      throw new Error(
        `${MANIFEST_PATH} 已过期，请先运行 node scripts/generate-agent-surface.mjs 同步产物。`
      );
    }
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await runCli(parseCliOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
