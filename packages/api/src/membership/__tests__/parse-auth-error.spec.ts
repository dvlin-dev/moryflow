import { describe, expect, it } from 'vitest';
import { parseAuthError } from '../const';

describe('parseAuthError', () => {
  it('maps known auth error codes to friendly messages', () => {
    expect(parseAuthError({ code: 'EMAIL_NOT_VERIFIED' })).toBe('Email not verified.');
  });

  it('parses JSON string message payload', () => {
    expect(
      parseAuthError({
        message: '{"code":"EMAIL_NOT_VERIFIED","message":"Email not verified"}',
      })
    ).toBe('Email not verified.');
  });

  it('supports nested error object payload', () => {
    expect(
      parseAuthError({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Incorrect password.',
        },
      })
    ).toBe('Incorrect password.');
  });
});
