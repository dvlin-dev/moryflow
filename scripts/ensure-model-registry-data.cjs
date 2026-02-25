/**
 * [PROVIDES]: 在构建前确保 model-registry-data 的 JSON 数据文件存在
 * [DEPENDS]: node:fs, node:path
 * [POS]: 根 postinstall/build:packages 的防护脚本，避免干净 CI 中 TS2307
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve, join } = require('node:path');

const MODEL_REGISTRY_SOURCE_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

const repoRoot = resolve(__dirname, '..');
const dataDir = join(repoRoot, 'packages', 'model-registry-data', 'src', 'data');

const defaultMeta = {
  syncedAt: new Date().toISOString(),
  modelCount: 0,
  providerCount: 0,
  source: MODEL_REGISTRY_SOURCE_URL,
};

const files = [
  { fileName: 'models.json', content: '[]\n' },
  { fileName: 'providers.json', content: '[]\n' },
  { fileName: 'meta.json', content: `${JSON.stringify(defaultMeta, null, 2)}\n` },
];

mkdirSync(dataDir, { recursive: true });

let createdCount = 0;
for (const file of files) {
  const filePath = join(dataDir, file.fileName);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, file.content, 'utf8');
    createdCount += 1;
  }
}

if (createdCount > 0) {
  console.log(
    `[prepare:model-registry-data] created ${createdCount} fallback file(s) under ${dataDir}`,
  );
}
