import { describe, it, expect, afterEach, vi } from 'vitest';

describe('ApiClient 响应解析', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('非 JSON 响应应抛出 UNEXPECTED_RESPONSE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      )
    );

    const { apiClient } = await import('./api-client');

    await expect(apiClient.get('/test')).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
    });
  });
});
