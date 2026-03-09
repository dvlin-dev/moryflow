import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readWorkspaceFile(relativePath) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('moryflow www Dockerfile copies shared download source into builder image', () => {
  const dockerfile = readWorkspaceFile('apps/moryflow/www/Dockerfile');

  assert.match(
    dockerfile,
    /COPY apps\/moryflow\/shared \.\/apps\/moryflow\/shared/,
    'www Dockerfile must copy apps/moryflow/shared so Vite can resolve shared download modules during image builds'
  );
});

test('moryflow docs Dockerfile copies shared download source into builder image', () => {
  const dockerfile = readWorkspaceFile('apps/moryflow/docs/Dockerfile');

  assert.match(
    dockerfile,
    /COPY apps\/moryflow\/shared \.\/apps\/moryflow\/shared/,
    'docs Dockerfile must copy apps/moryflow/shared so Vite can resolve shared download modules during image builds'
  );
});
