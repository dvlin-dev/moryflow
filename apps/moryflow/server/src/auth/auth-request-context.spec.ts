import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import {
  isBetterAuthTokenFirstPath,
  isDeviceTokenAuthPath,
  shouldIgnoreBrowserContextForAuthRequest,
  stripBrowserContextHeadersFromRequest,
} from './auth-request-context';

const createRequest = (
  originalUrl: string,
  headers: Record<string, string | undefined> = {},
): Request =>
  ({
    originalUrl,
    headers,
  }) as unknown as Request;

describe('auth request context', () => {
  it('should classify device token auth paths', () => {
    expect(isDeviceTokenAuthPath('/api/v1/auth/refresh')).toBe(true);
    expect(isDeviceTokenAuthPath('/api/v1/auth/social/google/exchange')).toBe(
      true,
    );
    expect(isDeviceTokenAuthPath('/api/v1/auth/sign-up/email/complete')).toBe(
      true,
    );
    expect(isDeviceTokenAuthPath('/api/v1/auth/social/google/start')).toBe(
      false,
    );
  });

  it('should classify Better Auth token-first paths only', () => {
    expect(isBetterAuthTokenFirstPath('/api/v1/auth/sign-in/email')).toBe(true);
    expect(
      isBetterAuthTokenFirstPath('/api/v1/auth/email-otp/verify-email'),
    ).toBe(true);
    expect(
      isBetterAuthTokenFirstPath('/api/v1/auth/sign-up/email/complete'),
    ).toBe(false);
  });

  it('should ignore browser context only for device token auth requests', () => {
    const request = createRequest('/api/v1/auth/refresh', {
      origin: 'http://127.0.0.1:4173',
      'x-app-platform': 'desktop',
    });

    expect(shouldIgnoreBrowserContextForAuthRequest(request)).toBe(true);
  });

  it('should preserve browser context for non-device auth requests', () => {
    const request = createRequest('/api/v1/auth/social/google/start', {
      origin: 'http://localhost:5173',
    });

    expect(shouldIgnoreBrowserContextForAuthRequest(request)).toBe(false);
  });

  it('should strip origin and referer from device token auth requests', () => {
    const request = createRequest('/api/v1/auth/refresh', {
      origin: 'http://127.0.0.1:4173',
      referer: 'http://127.0.0.1:4173/login',
      'x-app-platform': 'desktop',
    });

    stripBrowserContextHeadersFromRequest(request);

    expect(request.headers.origin).toBeUndefined();
    expect(request.headers.referer).toBeUndefined();
  });

  it('should keep origin and referer for browser auth requests', () => {
    const request = createRequest('/api/v1/auth/social/google/start', {
      origin: 'http://localhost:5173',
      referer: 'http://localhost:5173/login',
    });

    stripBrowserContextHeadersFromRequest(request);

    expect(request.headers.origin).toBe('http://localhost:5173');
    expect(request.headers.referer).toBe('http://localhost:5173/login');
  });
});
