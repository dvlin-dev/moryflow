#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_AGENTS_EXTENSIONS_VERSION = '0.5.1';
const REQUIRED_PATCH_MARKERS = [
  'function resolveReasoningContentToolCallOverride(providerData)',
  'providerData.providerOptions?.reasoningContentToolCalls',
  'const override = resolveReasoningContentToolCallOverride(modelSettings?.providerData);',
];

function findAgentsExtensionsPackageDir(rootDir) {
  const directPackageDir = path.join(rootDir, 'node_modules', '@openai', 'agents-extensions');
  if (fs.existsSync(path.join(directPackageDir, 'package.json'))) {
    return directPackageDir;
  }

  const pnpmStoreDir = path.join(rootDir, 'node_modules', '.pnpm');
  if (!fs.existsSync(pnpmStoreDir)) {
    return null;
  }

  const storeEntries = fs.readdirSync(pnpmStoreDir, { withFileTypes: true });
  for (const entry of storeEntries) {
    if (!entry.isDirectory() || !entry.name.startsWith('@openai+agents-extensions@')) {
      continue;
    }

    const packageDir = path.join(
      pnpmStoreDir,
      entry.name,
      'node_modules',
      '@openai',
      'agents-extensions'
    );
    if (fs.existsSync(path.join(packageDir, 'package.json'))) {
      return packageDir;
    }
  }

  return null;
}

function assertAgentsExtensionsPatch(rootDir = path.resolve(__dirname, '..')) {
  const packageDir = findAgentsExtensionsPackageDir(rootDir);
  if (!packageDir) {
    throw new Error(
      '[agents-extensions] patch verification failed: package is not installed in node_modules or pnpm store'
    );
  }

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
  findAgentsExtensionsPackageDir,
};
