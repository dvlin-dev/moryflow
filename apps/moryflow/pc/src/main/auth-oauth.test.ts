import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseOAuthCallbackDeepLink } from './auth-oauth';

describe('parseOAuthCallbackDeepLink', () => {
  const previousScheme = process.env.MORYFLOW_DEEP_LINK_SCHEME;

  beforeEach(() => {
    process.env.MORYFLOW_DEEP_LINK_SCHEME = 'moryflow';
  });

  afterEach(() => {
    if (previousScheme) {
      process.env.MORYFLOW_DEEP_LINK_SCHEME = previousScheme;
      return;
    }

    delete process.env.MORYFLOW_DEEP_LINK_SCHEME;
  });

  it('should parse auth success deep link with code and nonce', () => {
    const result = parseOAuthCallbackDeepLink('moryflow://auth/success?code=code_1&nonce=nonce_1');

    expect(result).toEqual({
      code: 'code_1',
      nonce: 'nonce_1',
    });
  });

  it('should return null for non-auth deep link', () => {
    const result = parseOAuthCallbackDeepLink('moryflow://payment/success?session_id=abc');

    expect(result).toBeNull();
  });

  it('should return null when code or nonce is missing', () => {
    expect(parseOAuthCallbackDeepLink('moryflow://auth/success?code=code_only')).toBeNull();
    expect(parseOAuthCallbackDeepLink('moryflow://auth/success?nonce=nonce_only')).toBeNull();
  });

  it('should return null for deep links with unexpected scheme', () => {
    const result = parseOAuthCallbackDeepLink(
      'other-scheme://auth/success?code=code_1&nonce=nonce_1'
    );

    expect(result).toBeNull();
  });
});
