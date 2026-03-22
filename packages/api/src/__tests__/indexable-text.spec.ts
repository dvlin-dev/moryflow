import { describe, expect, it } from 'vitest';
import { classifyIndexableText } from '../file-index';

describe('classifyIndexableText', () => {
  it('marks an empty string as non-indexable', () => {
    expect(classifyIndexableText('')).toEqual({
      indexable: false,
      normalizedText: null,
      reason: 'no_indexable_text',
    });
  });

  it('marks whitespace-only text as non-indexable', () => {
    expect(classifyIndexableText(' \n\t  ')).toEqual({
      indexable: false,
      normalizedText: null,
      reason: 'no_indexable_text',
    });
  });

  it('marks zero-width-only text as non-indexable', () => {
    expect(classifyIndexableText('\u200b\u200c\u200d\ufeff')).toEqual({
      indexable: false,
      normalizedText: null,
      reason: 'no_indexable_text',
    });
  });

  it('marks markdown heading-only content as non-indexable', () => {
    expect(classifyIndexableText('# Release Notes')).toEqual({
      indexable: false,
      normalizedText: null,
      reason: 'no_indexable_text',
    });
  });

  it('keeps markdown heading plus body content as indexable text', () => {
    expect(classifyIndexableText('# Release Notes\n\nShipped a fix.')).toEqual({
      indexable: true,
      normalizedText: '# Release Notes\n\nShipped a fix.',
      reason: null,
    });
  });

  it('normalizes mixed Chinese and English text', () => {
    expect(classifyIndexableText('  你好， Moryflow \n\n  hello world  ')).toEqual({
      indexable: true,
      normalizedText: '你好， Moryflow\n\n  hello world',
      reason: null,
    });
  });
});
