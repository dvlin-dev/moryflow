/**
 * [INPUT]: sync-utils pure functions
 * [OUTPUT]: regression coverage for fragment injection/default materialization
 * [POS]: site-template sync chain unit tests
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoUnresolvedFragmentPlaceholders,
  injectFragments,
  materializeTemplateDefaults,
} from './sync-utils.ts';

test('injectFragments should replace known placeholders and keep unknown ones', () => {
  const html = '{{KNOWN}} and {{UNKNOWN}}';
  const result = injectFragments(html, { KNOWN: '<button>ok</button>' });
  assert.equal(result, '<button>ok</button> and {{UNKNOWN}}');
});

test('materializeTemplateDefaults should keep page.html favicon placeholder', () => {
  const pageResult = materializeTemplateDefaults('page.html', '<link href="{{favicon}}">');
  const indexResult = materializeTemplateDefaults('index-page.html', '<link href="{{favicon}}">');
  assert.equal(pageResult, '<link href="{{favicon}}">');
  assert.equal(indexResult, '<link href="/favicon.ico">');
});

test('assertNoUnresolvedFragmentPlaceholders should throw on unresolved placeholders', () => {
  assert.throws(
    () =>
      assertNoUnresolvedFragmentPlaceholders('page.html', '<div>{{THEME_TOGGLE_BUTTON}}</div>', [
        'THEME_TOGGLE_BUTTON',
        'BRAND_FOOTER_LINK',
      ]),
    /THEME_TOGGLE_BUTTON/
  );

  assert.doesNotThrow(() =>
    assertNoUnresolvedFragmentPlaceholders('page.html', '<div><button>ok</button></div>', [
      'THEME_TOGGLE_BUTTON',
      'BRAND_FOOTER_LINK',
    ])
  );
});
