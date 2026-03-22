import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('./api-base', () => ({
  API_BASE_URL: 'http://localhost',
}));

vi.mock('./auth/auth-methods', () => ({
  authMethods: {
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('@/stores/auth', () => ({
  getAccessToken: vi.fn(() => null),
}));

describe('ApiClient 响应解析', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
  }, 30_000);
});
