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

async function readPackageName(rootDir, packagePath) {
  try {
    const raw = await readFile(path.join(rootDir, packagePath, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed.name === 'string' ? parsed.name : null;
  } catch {
    return null;
  }
}

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

async function runCli() {
  const rootDir = process.cwd();
  const manifest = await buildAgentSurface({ rootDir });
  const outputPath = path.join(rootDir, MANIFEST_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runCli();
}
