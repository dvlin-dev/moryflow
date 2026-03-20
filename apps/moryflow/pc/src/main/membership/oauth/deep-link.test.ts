import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  extractDeepLinkFromArgv,
  parseOAuthCallbackDeepLink,
  redactDeepLinkForLog,
} from './deep-link.js';

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

describe('extractDeepLinkFromArgv', () => {
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

  it('should extract deep link from argv', () => {
    const result = extractDeepLinkFromArgv([
      '/Applications/Moryflow.app/Contents/MacOS/Moryflow',
      '--inspect',
      'moryflow://auth/success?code=abc&nonce=xyz',
    ]);
    expect(result).toBe('moryflow://auth/success?code=abc&nonce=xyz');
  });

  it('should match deep link case-insensitively', () => {
    const result = extractDeepLinkFromArgv([
      '/Applications/Moryflow.app/Contents/MacOS/Moryflow',
      'MORYFLOW://auth/success?code=abc&nonce=xyz',
    ]);
    expect(result).toBe('MORYFLOW://auth/success?code=abc&nonce=xyz');
  });

  it('should return null when argv has no deep link', () => {
    const result = extractDeepLinkFromArgv([
      '/Applications/Moryflow.app/Contents/MacOS/Moryflow',
      '--some-flag',
    ]);
    expect(result).toBeNull();
  });
});

describe('redactDeepLinkForLog', () => {
  it('should redact oauth code and nonce', () => {
    const result = redactDeepLinkForLog('moryflow://auth/success?code=abc&nonce=xyz&foo=bar');
    expect(result).toContain('code=%5BREDACTED%5D');
    expect(result).toContain('nonce=%5BREDACTED%5D');
    expect(result).toContain('foo=bar');
  });

  it('should keep invalid deep link unchanged', () => {
    const input = 'not-a-url';
    expect(redactDeepLinkForLog(input)).toBe(input);
  });
});
