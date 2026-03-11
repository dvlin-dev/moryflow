/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfigMock, postMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@moryflow/api/client', () => {
  class MockServerApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
      this.name = 'ServerApiError';
    }
  }

  return {
    createApiClient: vi.fn(() => ({
      post: postMock,
      get: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      del: vi.fn(),
    })),
    createApiTransport: vi.fn(() => ({})),
    ServerApiError: MockServerApiError,
  };
});

vi.mock('../../membership-bridge.js', () => ({
  membershipBridge: {
    getConfig: getConfigMock,
  },
}));

import { memoryApi } from './client.js';

describe('memoryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockReturnValue({
      token: 'token-1',
      apiUrl: 'https://server.moryflow.com',
    });
  });

  it('posts fact list filters in request body instead of query string serialization', async () => {
    postMock.mockResolvedValue({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      page: 1,
      pageSize: 20,
      hasMore: false,
      items: [],
    });

    await memoryApi.listFacts({
      vaultId: 'vault-1',
      kind: 'manual',
      page: 1,
      pageSize: 20,
      categories: ['project', 'alpha'],
    });

    expect(postMock).toHaveBeenCalledWith('/api/v1/memory/facts/query', {
      body: {
        vaultId: 'vault-1',
        kind: 'manual',
        page: 1,
        pageSize: 20,
        categories: ['project', 'alpha'],
      },
    });
  });
});
