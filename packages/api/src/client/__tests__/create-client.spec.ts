import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServerApiClient } from '../create-client';
import { ServerApiError } from '../error';

describe('createServerApiClient', () => {
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

    const client = createServerApiClient({
      baseUrl: 'https://example.com',
      tokenProvider: { getToken: vi.fn().mockResolvedValue('token') },
    });

    const error = await client.user.fetchCredits().catch((err) => err);
    expect(error).toBeInstanceOf(ServerApiError);
    expect(error).toMatchObject({ code: 'UNEXPECTED_RESPONSE' });
  });
});
