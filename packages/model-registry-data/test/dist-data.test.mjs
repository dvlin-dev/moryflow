import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');

test('dist model count should match source models.json count', async () => {
  const sourceModelsPath = resolve(packageRoot, 'src/data/models.json');
  const sourceCount = JSON.parse(readFileSync(sourceModelsPath, 'utf8')).length;
  assert.ok(sourceCount > 0, 'source model snapshot must not be empty');

  const distEntryPath = resolve(packageRoot, 'dist/index.mjs');
  const distModule = await import(pathToFileURL(distEntryPath).href);
  const distCount = distModule.getModelCount();

  assert.ok(distCount > 0, 'dist model registry must not be empty');
  assert.equal(distCount, sourceCount);
});

test('dist search bundle should not require runtime data files', () => {
  const distSearchPath = resolve(packageRoot, 'dist/search.mjs');
  const distSearchCode = readFileSync(distSearchPath, 'utf8');

  assert.doesNotMatch(distSearchCode, /require\((['"])\\.\/data\/models\.json\1\)/);
  assert.doesNotMatch(distSearchCode, /require\((['"])\\.\/data\/providers\.json\1\)/);
});
