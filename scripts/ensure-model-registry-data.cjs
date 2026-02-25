/**
 * [PROVIDES]: 在构建前确保 model-registry-data 的 JSON 数据文件存在
 * [DEPENDS]: node:child_process, node:fs, node:path
 * [POS]: 根 postinstall/build:packages 的防护脚本，确保快照有效并避免干净 CI 中 TS2307
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { resolve, join } = require('node:path');

const MODEL_REGISTRY_PACKAGE = '@moryflow/model-registry-data';

const repoRoot = resolve(__dirname, '..');
const dataDir = join(repoRoot, 'packages', 'model-registry-data', 'src', 'data');
const modelsPath = join(dataDir, 'models.json');
const providersPath = join(dataDir, 'providers.json');
const metaPath = join(dataDir, 'meta.json');

function readJsonArray(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hasUsableSnapshot() {
  const models = readJsonArray(modelsPath);
  const providers = readJsonArray(providersPath);

  if (!models || !providers) {
    return false;
  }

  if (models.length === 0 || providers.length === 0) {
    return false;
  }

  return existsSync(metaPath);
}

function runSync() {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(command, ['--filter', MODEL_REGISTRY_PACKAGE, 'sync'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`[prepare:model-registry-data] sync failed with exit code ${result.status ?? 'unknown'}`);
  }
}

if (!hasUsableSnapshot()) {
  console.log(
    `[prepare:model-registry-data] snapshot missing or invalid under ${dataDir}, running ${MODEL_REGISTRY_PACKAGE} sync...`,
  );

  runSync();

  if (!hasUsableSnapshot()) {
    throw new Error(
      `[prepare:model-registry-data] sync completed but usable snapshot is still missing under ${dataDir}`,
    );
  }

  console.log('[prepare:model-registry-data] usable snapshot is ready');
} else {
  console.log('[prepare:model-registry-data] using existing usable snapshot');
}
