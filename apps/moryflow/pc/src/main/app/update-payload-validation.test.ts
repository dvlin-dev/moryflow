import { describe, expect, it } from 'vitest';
import { parseSkipVersionPayload } from './update-payload-validation.js';

describe('parseSkipVersionPayload', () => {
  it('rejects primitive payloads without throwing', () => {
    expect(parseSkipVersionPayload(42)).toEqual({
      isValid: false,
      version: undefined,
    });
    expect(parseSkipVersionPayload('1.4.0')).toEqual({
      isValid: false,
      version: undefined,
    });
  });

  it('accepts omitted, null, and string versions', () => {
    expect(parseSkipVersionPayload(undefined)).toEqual({
      isValid: true,
      version: undefined,
    });
    expect(parseSkipVersionPayload({ version: null })).toEqual({
      isValid: true,
      version: null,
    });
    expect(parseSkipVersionPayload({ version: '1.4.0' })).toEqual({
      isValid: true,
      version: '1.4.0',
    });
  });
});
