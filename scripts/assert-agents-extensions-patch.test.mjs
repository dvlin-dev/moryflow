import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  assertAgentsExtensionsPatch,
  EXPECTED_AGENTS_EXTENSIONS_VERSION,
} = require('./assert-agents-extensions-patch.cjs');

const PATCHED_FILE_CONTENT = `
function resolveReasoningContentToolCallOverride(providerData) {
  const override = providerData.reasoningContentToolCalls ??
    providerData.providerOptions?.reasoningContentToolCalls;
  return typeof override === 'boolean' ? override : undefined;
}
function shouldIncludeReasoningContent(model, modelSettings) {
  const override = resolveReasoningContentToolCallOverride(modelSettings?.providerData);
  if (override !== undefined) {
    return override;
  }
}
`;

const createPatchedInstall = async (rootDir, fileContent = PATCHED_FILE_CONTENT) => {
  const packageDir = path.join(rootDir, 'node_modules', '@openai', 'agents-extensions');
  const distDir = path.join(packageDir, 'dist', 'ai-sdk');
  await mkdir(distDir, { recursive: true });
  await writeFile(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ version: EXPECTED_AGENTS_EXTENSIONS_VERSION }, null, 2)
  );
  await writeFile(path.join(distDir, 'index.js'), fileContent);
  await writeFile(path.join(distDir, 'index.mjs'), fileContent);
};

test('assertAgentsExtensionsPatch accepts the expected patched install', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'agents-extensions-patch-ok-'));
  try {
    await createPatchedInstall(rootDir);
    assert.doesNotThrow(() => assertAgentsExtensionsPatch(rootDir));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('assertAgentsExtensionsPatch rejects an unpatched install', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'agents-extensions-patch-bad-'));
  try {
    await createPatchedInstall(
      rootDir,
      'function shouldIncludeReasoningContent(model, modelSettings) { return false; }'
    );
    assert.throws(() => assertAgentsExtensionsPatch(rootDir), /patch verification failed/i);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
