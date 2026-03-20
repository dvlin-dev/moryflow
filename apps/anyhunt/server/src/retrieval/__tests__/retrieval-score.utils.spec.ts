import { describe, expect, it } from 'vitest';
import {
  buildCenteredSnippet,
  truncateSnippet,
} from '../retrieval-score.utils';

const hasIsolatedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return true;
      }
      index += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const codePointLength = (value: string): number => Array.from(value).length;

describe('retrieval-score.utils', () => {
  it('truncateSnippet 不会把高位 Unicode 截成孤立 surrogate', () => {
    const value = truncateSnippet(`前缀 ${'𠀀'.repeat(12)} 后缀`, 7);

    expect(codePointLength(value)).toBeLessThanOrEqual(7);
    expect(hasIsolatedSurrogate(value)).toBe(false);
  });

  it('buildCenteredSnippet 在 partial left/right 截断时也不会破坏 surrogate pair', () => {
    const value = buildCenteredSnippet(
      [
        { chunkIndex: 0, content: `${'𠀀'.repeat(12)} 左侧内容` },
        { chunkIndex: 1, content: `中间 ${'𠀀'.repeat(6)} 命中` },
        { chunkIndex: 2, content: `右侧 ${'𠀀'.repeat(12)} 内容` },
      ],
      1,
      16,
    );

    expect(codePointLength(value)).toBeLessThanOrEqual(16);
    expect(hasIsolatedSurrogate(value)).toBe(false);
  });
});
