import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxClient } from './memox.client';
import type { MemoxRuntimeConfigService } from './memox-runtime-config.service';
import {
  ServerApiError,
  serverHttpJson,
  serverHttpVoid,
} from '../common/http/server-http-client';

vi.mock('../common/http/server-http-client', () => ({
  serverHttpJson: vi.fn(),
  serverHttpVoid: vi.fn(),
  ServerApiError: class extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code?: string,
      public readonly details?: unknown,
      public readonly requestId?: string,
    ) {
      super(message);
    }
  },
}));

describe('MemoxClient', () => {
  const serverHttpJsonMock = vi.mocked(serverHttpJson);
  const serverHttpVoidMock = vi.mocked(serverHttpVoid);
  let runtimeConfigService: {
    getAnyhuntApiBaseUrl: ReturnType<typeof vi.fn>;
    getAnyhuntApiKey: ReturnType<typeof vi.fn>;
    getAnyhuntRequestTimeoutMs: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    runtimeConfigService = {
      getAnyhuntApiBaseUrl: vi
        .fn()
        .mockReturnValue('https://server.anyhunt.app'),
      getAnyhuntApiKey: vi.fn().mockReturnValue('ah_test_key'),
      getAnyhuntRequestTimeoutMs: vi.fn().mockReturnValue(15000),
    };
  });

  it('uses service api key and request id when calling Anyhunt Memox', async () => {
    serverHttpJsonMock.mockResolvedValue({
      source_id: 'source-1',
      source_type: 'note_markdown',
      external_id: 'file-1',
      user_id: 'user-1',
      agent_id: null,
      app_id: null,
      run_id: null,
      org_id: null,
      project_id: 'vault-1',
      title: 'Doc',
      display_path: '/Doc.md',
      mime_type: 'text/markdown',
      metadata: null,
      current_revision_id: null,
      status: 'ACTIVE',
      created_at: '2026-03-07T00:00:00.000Z',
      updated_at: '2026-03-07T00:00:00.000Z',
    });
    const client = new MemoxClient(
      runtimeConfigService as unknown as MemoxRuntimeConfigService,
    );

    await client.resolveSourceIdentity({
      sourceType: 'note_markdown',
      externalId: 'file-1',
      requestId: 'req_1',
      idempotencyKey: 'idem_1',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
      },
    });

    expect(serverHttpJsonMock).toHaveBeenCalledWith({
      url: 'https://server.anyhunt.app/api/v1/source-identities/note_markdown/file-1',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ah_test_key',
        'Idempotency-Key': 'idem_1',
        'X-Request-Id': 'req_1',
      },
      body: JSON.stringify({
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
      }),
      timeoutMs: 15000,
    });
  });

  it('supports void Anyhunt endpoints via raw transport', async () => {
    serverHttpVoidMock.mockResolvedValue(undefined);
    const client = new MemoxClient(
      runtimeConfigService as unknown as MemoxRuntimeConfigService,
    );

    await client.requestVoid({
      path: '/api/v1/memories/fact-1',
      method: 'DELETE',
      requestId: 'req_delete',
    });

    expect(serverHttpVoidMock).toHaveBeenCalledWith({
      url: 'https://server.anyhunt.app/api/v1/memories/fact-1',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ah_test_key',
        'X-Request-Id': 'req_delete',
      },
      body: undefined,
      timeoutMs: 15000,
    });
  });

  it('normalizes RFC7807 style errors into MemoxGatewayError', async () => {
    serverHttpJsonMock.mockRejectedValue(
      new ServerApiError(
        409,
        'Conflict',
        'SOURCE_UPLOAD_WINDOW_EXPIRED',
        { detail: 'expired' },
        'req_conflict',
      ),
    );
    const client = new MemoxClient(
      runtimeConfigService as unknown as MemoxRuntimeConfigService,
    );

    await expect(
      client.searchSources({
        requestId: 'req_2',
        body: {
          query: 'alpha',
          top_k: 10,
          include_graph_context: false,
          user_id: 'user-1',
        },
      }),
    ).rejects.toMatchObject({
      name: 'MemoxGatewayError',
      status: 409,
      code: 'SOURCE_UPLOAD_WINDOW_EXPIRED',
      requestId: 'req_conflict',
    });
  });
});
