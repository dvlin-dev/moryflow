import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { getQueryErrorMessage, toIsoDateTimeOrUndefined, toStatusCodeOrUndefined } from './utils';

describe('logs utils', () => {
  it('should convert datetime-local string to ISO string', () => {
    const input = '2026-02-24T08:30';
    expect(toIsoDateTimeOrUndefined(input)).toBe(new Date(input).toISOString());
  });

  it('should return undefined for empty datetime-local input', () => {
    expect(toIsoDateTimeOrUndefined('   ')).toBeUndefined();
  });

  it('should parse valid http status code', () => {
    expect(toStatusCodeOrUndefined('429')).toBe(429);
  });

  it('should return undefined for invalid status code', () => {
    expect(toStatusCodeOrUndefined('abc')).toBeUndefined();
    expect(toStatusCodeOrUndefined('99')).toBeUndefined();
    expect(toStatusCodeOrUndefined('600')).toBeUndefined();
  });

  it('should format api query error message', () => {
    const err = new ApiError(429, 'Too Many Requests', 'TOO_MANY_REQUESTS');
    expect(getQueryErrorMessage(err, 'fallback')).toBe('Too Many Requests');
    expect(getQueryErrorMessage(new Error('bad'), 'fallback')).toBe('bad');
    expect(getQueryErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
