import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDocsOnlyStagedFile,
  shouldSkipPrecommitTypecheck,
} from './should-skip-precommit-typecheck.mjs';

test('markdown staged files are treated as docs-only', () => {
  assert.equal(isDocsOnlyStagedFile('CLAUDE.md'), true);
  assert.equal(isDocsOnlyStagedFile('docs/index.md'), true);
  assert.equal(isDocsOnlyStagedFile('apps/moryflow/docs/src/routes/changelog.mdx'), true);
});

test('code files are not treated as docs-only', () => {
  assert.equal(isDocsOnlyStagedFile('apps/moryflow/server/src/app.module.ts'), false);
  assert.equal(isDocsOnlyStagedFile('apps/anyhunt/docs/src/routes/index.tsx'), false);
  assert.equal(isDocsOnlyStagedFile('.husky/pre-commit'), false);
});

test('skip typecheck only when every staged file is markdown', () => {
  assert.equal(shouldSkipPrecommitTypecheck(['CLAUDE.md', 'docs/index.md']), true);
  assert.equal(
    shouldSkipPrecommitTypecheck(['CLAUDE.md', 'apps/moryflow/server/src/app.module.ts']),
    false
  );
  assert.equal(shouldSkipPrecommitTypecheck([]), false);
  assert.equal(
    shouldSkipPrecommitTypecheck(['apps/moryflow/server/src/memox/legacy-vector-search.client.ts']),
    false
  );
});
