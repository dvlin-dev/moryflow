/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  buildExactMatchQuery,
  buildFuzzyMatchQuery,
  buildFuzzyTokenStream,
  buildFuzzyTokens,
} from './tokenizer.js';

describe('search-index tokenizer', () => {
  it('exact 查询按空白切词并使用 AND 连接', () => {
    expect(buildExactMatchQuery('hello world')).toBe('"hello" AND "world"');
    expect(buildExactMatchQuery('   ')).toBeNull();
  });

  it('fuzzy token 同时覆盖中文与英文子串', () => {
    expect(buildFuzzyTokens('你好吗', 20)).toEqual(['你好', '好吗', '你好吗']);
    expect(buildFuzzyTokens('hello', 20)).toEqual(['he', 'el', 'll', 'lo', 'hel', 'ell', 'llo']);
  });

  it('fuzzy match 查询使用 N-gram token 的 AND 组合', () => {
    expect(buildFuzzyMatchQuery('你好', 20)).toBe('"你好"');
    expect(buildFuzzyMatchQuery('ell', 20)).toBe('"el" AND "ll" AND "ell"');
  });

  it('token stream 会去重并受上限控制', () => {
    expect(buildFuzzyTokenStream('hello hello', 4)).toBe('he el ll lo');
  });
});
