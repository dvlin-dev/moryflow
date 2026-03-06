/**
 * [INPUT]: build-utils pure functions
 * [OUTPUT]: regression coverage for style resolving/minify/template contracts
 * [POS]: site-template build chain unit tests
 */

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import test from 'node:test';
import { minifyCss, resolveStyleImports, validateTemplateContracts } from './build-utils';

test('resolveStyleImports should inline relative imports and strip tailwind import', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-template-style-'));
  const stylesDir = join(root, 'styles');
  mkdirSync(stylesDir, { recursive: true });
  writeFileSync(
    join(stylesDir, 'app.css'),
    "@import 'tailwindcss';\n@import './tokens.css';\nbody { color: red; }\n",
    'utf-8'
  );
  writeFileSync(join(stylesDir, 'tokens.css'), ':root { --brand: #000; }\n', 'utf-8');

  const result = resolveStyleImports(join(stylesDir, 'app.css'));
  assert.ok(result.includes(':root { --brand: #000; }'));
  assert.ok(result.includes('body { color: red; }'));
  assert.equal(result.includes('tailwindcss'), false);

  return rm(root, { recursive: true, force: true });
});

test('minifyCss should strip comments and collapse whitespace', () => {
  const minified = minifyCss('/* comment */\n .a { color : red ; }\n');
  assert.equal(minified, '.a{color:red}');
});

test('validateTemplateContracts should throw when placeholder is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-template-contract-'));
  writeFileSync(join(root, 'sample.html'), '<div>hello</div>', 'utf-8');

  assert.throws(
    () =>
      validateTemplateContracts(root, {
        'sample.html': ['{{required}}'],
      }),
    /missing \{\{required\}\}/
  );

  return rm(root, { recursive: true, force: true });
});
