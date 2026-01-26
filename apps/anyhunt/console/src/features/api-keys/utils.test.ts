import { describe, it, expect } from 'vitest';
import { maskApiKey } from './utils';

describe('maskApiKey', () => {
  it('returns empty string for empty input', () => {
    expect(maskApiKey('')).toBe('');
  });

  it('returns original key when shorter than prefix + suffix', () => {
    expect(maskApiKey('ah_1234')).toBe('ah_1234');
  });

  it('masks key with default prefix/suffix lengths', () => {
    const key = 'ah_1234567890abcd';
    expect(maskApiKey(key)).toBe('ah_12345******abcd');
  });

  it('supports custom prefix/suffix lengths', () => {
    const key = 'ah_1234567890abcdef';
    expect(maskApiKey(key, { prefixLength: 3, suffixLength: 2 })).toBe('ah_******ef');
  });
});
