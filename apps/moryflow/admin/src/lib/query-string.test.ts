import { describe, expect, it } from 'vitest';
import { buildQuerySuffix } from './query-string';

describe('buildQuerySuffix', () => {
  it('忽略 undefined/null/空字符串参数', () => {
    expect(
      buildQuerySuffix({
        a: '1',
        b: undefined,
        c: null,
        d: '',
      })
    ).toBe('?a=1');
  });

  it('全部为空时返回空字符串', () => {
    expect(
      buildQuerySuffix({
        a: undefined,
        b: '',
      })
    ).toBe('');
  });
});
