import { describe, it, expect } from 'vitest';
import { toSmartString } from '../../src/utils/index';

describe('utils/index', () => {
  it('toSmartString', () => {
    expect(toSmartString('foo')).toBe('foo');
  });
});
