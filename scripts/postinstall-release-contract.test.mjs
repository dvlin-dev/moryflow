import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

test('agents-extensions patch validation runs from the build entrypoint', async () => {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));

  assert.match(
    packageJson.scripts['build:agents'],
    /^node scripts\/assert-agents-extensions-patch\.cjs && /
  );
});

test('root postinstall does not hard-fail on agents-extensions patch validation', async () => {
  const postinstallScript = await readFile(
    path.join(rootDir, 'scripts', 'postinstall.cjs'),
    'utf8'
  );

  assert.doesNotMatch(
    postinstallScript,
    /assertAgentsExtensionsPatch\(/,
    'root postinstall must not validate nested workspace dependencies before install linking completes'
  );
});
