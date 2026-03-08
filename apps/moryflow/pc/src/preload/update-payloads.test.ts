import { describe, expect, it } from 'vitest';
import { createSkipVersionPayload } from './update-payloads';

describe('createSkipVersionPayload', () => {
  it('omits the version key when callers do not provide an override', () => {
    expect(createSkipVersionPayload()).toEqual({});
  });

  it('preserves explicit null and string versions', () => {
    expect(createSkipVersionPayload(null)).toEqual({ version: null });
    expect(createSkipVersionPayload('1.4.0')).toEqual({ version: '1.4.0' });
  });
});
