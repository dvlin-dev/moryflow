/**
 * [INPUT]: unknown auth error samples
 * [OUTPUT]: normalized status/message assertions
 * [POS]: auth error guard regression tests
 */

import { describe, expect, it } from 'vitest';
import { isUnauthorizedLikeError, resolveErrorMessage, resolveErrorStatus } from '../auth-error';

describe('auth-error helpers', () => {
  it('resolves numeric status from unknown error records', () => {
    expect(resolveErrorStatus({ status: 401 })).toBe(401);
    expect(resolveErrorStatus({ status: '401' })).toBeNull();
    expect(resolveErrorStatus(null)).toBeNull();
  });

  it('detects unauthorized-like statuses', () => {
    expect(isUnauthorizedLikeError({ status: 401 })).toBe(true);
    expect(isUnauthorizedLikeError({ status: 403 })).toBe(true);
    expect(isUnauthorizedLikeError({ status: 500 })).toBe(false);
  });

  it('normalizes message with fallback', () => {
    expect(resolveErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(resolveErrorMessage({ message: 'from-record' }, 'fallback')).toBe('from-record');
    expect(resolveErrorMessage({ message: '' }, 'fallback')).toBe('fallback');
    expect(resolveErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
