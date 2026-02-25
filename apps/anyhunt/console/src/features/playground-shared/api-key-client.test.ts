import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createApiClient: vi.fn(),
  createApiTransport: vi.fn(),
  requestGet: vi.fn(),
  requestPost: vi.fn(),
  requestPut: vi.fn(),
  requestPatch: vi.fn(),
  requestDelete: vi.fn(),
}));

vi.mock('@/lib/api-base', () => ({
  API_BASE_URL: '',
}));

vi.mock('@anyhunt/api/client', () => {
  class MockServerApiError extends Error {
    status: number;
    code: string;

    constructor(message: string, status: number, code: string) {
      super(message);
      this.name = 'ServerApiError';
      this.status = status;
      this.code = code;
    }
  }

  return {
    createApiClient: mocks.createApiClient,
    createApiTransport: mocks.createApiTransport,
    ServerApiError: MockServerApiError,
  };
});

describe('createApiKeyClient', () => {
  beforeEach(() => {
    mocks.requestGet.mockResolvedValue({});
    mocks.requestPost.mockResolvedValue({});
    mocks.requestPut.mockResolvedValue({});
    mocks.requestPatch.mockResolvedValue({});
    mocks.requestDelete.mockResolvedValue({});

    mocks.createApiTransport.mockImplementation((config) => config);
    mocks.createApiClient.mockReturnValue({
      get: mocks.requestGet,
      post: mocks.requestPost,
      put: mocks.requestPut,
      patch: mocks.requestPatch,
      del: mocks.requestDelete,
    });
  });

  it('uses window origin when API_BASE_URL is empty', async () => {
    const { createApiKeyClient } = await import('./api-key-client');
    createApiKeyClient({ apiKey: 'ah_test_key' });

    expect(mocks.createApiTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: window.location.origin,
      })
    );
  });

  it('rethrows ServerApiError as ApiKeyClientError in delete path', async () => {
    const { createApiKeyClient, ApiKeyClientError } = await import('./api-key-client');
    const { ServerApiError } = await import('@anyhunt/api/client');
    mocks.requestDelete.mockRejectedValue(new ServerApiError('Denied', 403, 'FORBIDDEN'));

    const client = createApiKeyClient({ apiKey: 'ah_test_key' });

    await expect(client.delete('/api/v1/memox/memories/test')).rejects.toBeInstanceOf(
      ApiKeyClientError
    );
    await expect(client.delete('/api/v1/memox/memories/test')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });
});
