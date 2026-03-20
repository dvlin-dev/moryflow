import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export type FakeMembershipMemoryServerInput = {
  workspaceId?: string;
  projectId?: string;
  syncVaultId?: string;
};

export type FakeMembershipMemoryServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return null;
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const writeJson = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

export const createFakeMembershipMemoryServer = async (
  input: FakeMembershipMemoryServerInput = {}
): Promise<FakeMembershipMemoryServer> => {
  const workspaceId = input.workspaceId ?? 'workspace-e2e-1';
  const projectId = input.projectId ?? 'project-e2e-1';
  const syncVaultId = input.syncVaultId ?? 'vault-cloud-1';

  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (request.method === 'GET' && url.pathname === '/api/v1/user/me') {
      writeJson(response, 200, { id: 'user-e2e-1' });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/workspaces/resolve') {
      writeJson(response, 200, {
        workspaceId,
        memoryProjectId: projectId,
        syncVaultId,
        syncEnabled: true,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/memory/search') {
      const body = (await readJsonBody(request)) as {
        query?: string;
      } | null;
      writeJson(response, 200, {
        scope: {
          workspaceId,
          projectId,
          syncVaultId,
        },
        query: body?.query ?? '',
        groups: {
          files: {
            items: [
              {
                id: 'source-result-1',
                documentId: 'document-1',
                workspaceId,
                sourceId: 'source-1',
                title: 'Alpha',
                path: 'Docs/Alpha.md',
                snippet: 'alpha snippet',
                score: 0.9,
              },
            ],
            returnedCount: 1,
            hasMore: false,
          },
          facts: {
            items: [
              {
                id: 'fact-1',
                text: 'Alpha fact',
                kind: 'source-derived',
                readOnly: true,
                metadata: null,
                score: 0.8,
                sourceId: 'source-1',
              },
            ],
            returnedCount: 1,
            hasMore: false,
          },
        },
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/memory/graph/query') {
      writeJson(response, 200, {
        scope: {
          workspaceId,
          projectId,
          syncVaultId,
        },
        entities: [
          {
            id: 'entity-1',
            entityType: 'topic',
            canonicalName: 'Alpha',
            aliases: ['A'],
            metadata: null,
            lastSeenAt: null,
          },
        ],
        relations: [],
        evidenceSummary: {
          observationCount: 1,
          sourceCount: 1,
          memoryFactCount: 1,
          latestObservedAt: null,
        },
      });
      return;
    }

    writeJson(response, 404, {
      code: 'NOT_FOUND',
      message: `${request.method} ${url.pathname} not stubbed`,
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start fake membership memory server.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};
