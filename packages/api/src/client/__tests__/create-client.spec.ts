import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApiClient } from '../create-api-client';
import { ServerApiError } from '../error';

describe('createApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('throws UNEXPECTED_RESPONSE when response is not json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      )
    );

    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
    });

    const error = await client.get('/api/v1/user/credits').catch((err) => err);
    expect(error).toBeInstanceOf(ServerApiError);
    expect(error).toMatchObject({ code: 'UNEXPECTED_RESPONSE' });
  });

  it('retries once when bearer request gets 401 and onUnauthorized returns true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED', detail: 'expired' }), {
          status: 401,
          headers: { 'content-type': 'application/problem+json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const onUnauthorized = vi.fn().mockResolvedValue(true);
    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
      onUnauthorized,
    });

    const result = await client.get<{ ok: boolean }>('/api/ping');
    expect(result).toEqual({ ok: true });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps raw response body readable for caller', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
    });

    const response = await client.raw('/api/raw');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('keeps raw non-ok response available for caller', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('redirecting', {
          status: 302,
          headers: { location: 'https://example.com/next' },
        })
      )
    );

    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
    });

    const response = await client.raw('/api/raw-redirect', { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/next');
  });

  it('uses payload.message when detail is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'BAD_REQUEST', message: 'Invalid password' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
    });

    const error = await client
      .post('/api/v1/auth/sign-in', { body: { email: 'demo@example.com' } })
      .catch((err) => err);
    expect(error).toBeInstanceOf(ServerApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid password',
    });
  });

  it('parses error body when content-type is text/plain but payload is json string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Please try again later.',
          }),
          {
            status: 429,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          }
        )
      )
    );

    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
    });

    const error = await client
      .post('/api/v1/auth/sign-in', { body: { email: 'demo@example.com' } })
      .catch((err) => err);
    expect(error).toBeInstanceOf(ServerApiError);
    expect(error).toMatchObject({
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later.',
    });
  });

  it('falls back to plain text body for non-json error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Service temporarily unavailable', {
          status: 503,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      )
    );

    const client = createApiClient({
      baseUrl: 'https://example.com',
      getAccessToken: vi.fn().mockResolvedValue('token'),
    });

    const error = await client.get('/api/v1/ping').catch((err) => err);
    expect(error).toBeInstanceOf(ServerApiError);
    expect(error).toMatchObject({
      status: 503,
      code: 'UNKNOWN_ERROR',
      message: 'Service temporarily unavailable',
    });
  });
});
