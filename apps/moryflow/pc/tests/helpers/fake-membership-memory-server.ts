import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { MemoryKnowledgeStatusItem, MemoryOverview } from '../../src/shared/ipc/memory.js';

export type FakeMembershipMemoryServerInput = {
  workspaceId?: string;
  projectId?: string;
  syncVaultId?: string;
  overview?: Partial<MemoryOverview['indexing']> & {
    manualCount?: number;
    derivedCount?: number;
    entityCount?: number;
    relationCount?: number;
    projectionStatus?: MemoryOverview['graph']['projectionStatus'];
    lastProjectedAt?: string | null;
  };
  attentionItems?: MemoryKnowledgeStatusItem[];
  indexingItems?: MemoryKnowledgeStatusItem[];
  listFactsItems?: Array<{
    id: string;
    text: string;
    kind: 'manual' | 'source-derived';
    readOnly: boolean;
    metadata: Record<string, unknown> | null;
    categories: string[];
    sourceId: string | null;
    sourceRevisionId: string | null;
    derivedKey: string | null;
    expirationDate: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  delays?: {
    overviewMs?: number;
  };
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

const sleep = async (ms: number | undefined) => {
  if (!ms || ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const createFakeMembershipMemoryServer = async (
  input: FakeMembershipMemoryServerInput = {}
): Promise<FakeMembershipMemoryServer> => {
  const workspaceId = input.workspaceId ?? 'workspace-e2e-1';
  const projectId = input.projectId ?? 'project-e2e-1';
  const syncVaultId = input.syncVaultId ?? 'vault-cloud-1';
  const overview = input.overview ?? {};
  const attentionItems = input.attentionItems ?? [];
  const indexingItems = input.indexingItems ?? [];
  const listFactsItems = input.listFactsItems ?? [];

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

    if (request.method === 'GET' && url.pathname === '/api/v1/memory/overview') {
      await sleep(input.delays?.overviewMs);
      writeJson(response, 200, {
        scope: {
          workspaceId,
          projectId,
          syncVaultId,
        },
        indexing: {
          sourceCount: overview.sourceCount ?? 0,
          indexedSourceCount: overview.indexedSourceCount ?? 0,
          indexingSourceCount: overview.indexingSourceCount ?? 0,
          attentionSourceCount: overview.attentionSourceCount ?? 0,
          lastIndexedAt: overview.lastIndexedAt ?? null,
        },
        facts: {
          manualCount: overview.manualCount ?? 0,
          derivedCount: overview.derivedCount ?? 0,
        },
        graph: {
          entityCount: overview.entityCount ?? 0,
          relationCount: overview.relationCount ?? 0,
          projectionStatus: overview.projectionStatus ?? 'idle',
          lastProjectedAt: overview.lastProjectedAt ?? null,
        },
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/memory/knowledge-statuses') {
      const filter = url.searchParams.get('filter');
      const items =
        filter === 'attention' ? attentionItems : filter === 'indexing' ? indexingItems : [];
      writeJson(response, 200, {
        scope: {
          workspaceId,
          projectId,
          syncVaultId,
        },
        items,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/memory/facts/query') {
      writeJson(response, 200, {
        scope: {
          workspaceId,
          projectId,
          syncVaultId,
        },
        page: 1,
        pageSize: 20,
        hasMore: false,
        items: listFactsItems,
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
