import { describe, test, expect } from 'vitest';
import { getDefaultModelProvider } from '../src/providers';

describe('providers', () => {
  test('getDefaultModelProvider', () => {
    expect(() => getDefaultModelProvider()).toThrow();
  });
});
