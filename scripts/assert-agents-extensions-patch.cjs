#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_AGENTS_EXTENSIONS_VERSION = '0.5.1';
const AGENTS_EXTENSIONS_CONSUMER_PATHS = [
  path.join('packages', 'agents-runtime'),
  path.join('apps', 'anyhunt', 'server'),
];
const REQUIRED_PATCH_MARKERS = [
  'function resolveReasoningContentToolCallOverride(providerData)',
  'providerData.providerOptions?.reasoningContentToolCalls',
  'const override = resolveReasoningContentToolCallOverride(modelSettings?.providerData);',
];

function resolvePackageDirFromModuleEntry(moduleEntryPath) {
  let currentDir = path.dirname(moduleEntryPath);
  const { root } = path.parse(currentDir);

  while (true) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    if (currentDir === root) {
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error(
    `[agents-extensions] patch verification failed: could not locate package.json from resolved module entry ${moduleEntryPath}`
  );
}

function resolveAgentsExtensionsPackageDir(rootDir) {
  const searchRoots = [
    rootDir,
    ...AGENTS_EXTENSIONS_CONSUMER_PATHS.map((consumerPath) =>
      path.join(rootDir, consumerPath)
    ),
  ];

  for (const searchRoot of searchRoots) {
    try {
      const moduleEntryPath = require.resolve('@openai/agents-extensions', {
        paths: [searchRoot],
      });
      return resolvePackageDirFromModuleEntry(moduleEntryPath);
    } catch {}
  }

  throw new Error(
    '[agents-extensions] patch verification failed: package could not be resolved from repository root or direct consumers'
  );
}

function assertAgentsExtensionsPatch(rootDir = path.resolve(__dirname, '..')) {
  const packageDir = resolveAgentsExtensionsPackageDir(rootDir);
  const packageJsonPath = path.join(packageDir, 'package.json');

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.version !== EXPECTED_AGENTS_EXTENSIONS_VERSION) {
    throw new Error(
      `[agents-extensions] patch verification failed: expected version ${EXPECTED_AGENTS_EXTENSIONS_VERSION}, got ${packageJson.version}`
    );
  }

  for (const entry of ['index.js', 'index.mjs']) {
    const filePath = path.join(packageDir, 'dist', 'ai-sdk', entry);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `[agents-extensions] patch verification failed: missing dist/ai-sdk/${entry}`
      );
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const marker of REQUIRED_PATCH_MARKERS) {
      if (!content.includes(marker)) {
        throw new Error(
          `[agents-extensions] patch verification failed: dist/ai-sdk/${entry} is missing marker "${marker}"`
        );
      }
    }
  }
}

if (require.main === module) {
  try {
    assertAgentsExtensionsPatch(path.resolve(__dirname, '..'));
    console.log('[postinstall] verified @openai/agents-extensions reasoning patch');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  assertAgentsExtensionsPatch,
  EXPECTED_AGENTS_EXTENSIONS_VERSION,
  resolveAgentsExtensionsPackageDir,
  resolvePackageDirFromModuleEntry,
};
