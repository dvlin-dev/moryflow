import { describe, expect, it } from 'vitest';
import type { MemoryKnowledgeStatusItem, MemoryOverview } from '@shared/ipc';
import { deriveKnowledgeSummary } from './knowledge-status';

const createOverview = (
  overrides?: Partial<MemoryOverview['indexing']>,
  bootstrap?: Partial<MemoryOverview['bootstrap']>,
  projection?: {
    pending?: boolean;
    unresolvedEventCount?: number;
  }
): MemoryOverview => ({
  scope: {
    workspaceId: 'ws-1',
    workspaceName: 'Test',
    localPath: '/test',
    vaultId: null,
    projectId: 'proj-1',
  },
  binding: { loggedIn: true, bound: true },
  bootstrap: {
    pending: false,
    hasLocalDocuments: false,
    ...bootstrap,
  },
  projection: {
    pending: false,
    unresolvedEventCount: 0,
    ...projection,
  },
  sync: { engineStatus: 'idle', lastSyncAt: null, storageUsedBytes: 0 },
  indexing: {
    sourceCount: 8,
    indexedSourceCount: 6,
    indexingSourceCount: 0,
    attentionSourceCount: 0,
    lastIndexedAt: null,
    ...overrides,
  },
  facts: { manualCount: 2, derivedCount: 4 },
  graph: {
    entityCount: 2,
    relationCount: 1,
    projectionStatus: 'ready',
    lastProjectedAt: null,
  },
} as MemoryOverview);

const attentionItem: MemoryKnowledgeStatusItem = {
  documentId: 'doc-attention',
  title: 'Broken doc',
  path: 'notes/broken.md',
  state: 'NEEDS_ATTENTION',
  userFacingReason: 'The latest indexing attempt failed.',
  lastAttemptAt: null,
};

const indexingItem: MemoryKnowledgeStatusItem = {
  documentId: 'doc-indexing',
  title: 'Draft doc',
  path: 'notes/draft.md',
  state: 'INDEXING',
  userFacingReason: 'Indexing is in progress.',
  lastAttemptAt: null,
};

describe('deriveKnowledgeSummary', () => {
  it('returns scanning while overview is loading', () => {
    expect(deriveKnowledgeSummary({ overview: null, loading: true }).state).toBe('SCANNING');
  });

  it('returns scanning while local files are bootstrapping into memory', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview(
        {
          sourceCount: 0,
          indexedSourceCount: 0,
          indexingSourceCount: 0,
          attentionSourceCount: 0,
        },
        {
          pending: true,
          hasLocalDocuments: true,
        }
      ),
      loading: false,
      attentionItems: [],
      indexingItems: [],
    });

    expect(summary.state).toBe('SCANNING');
  });

  it('keeps bootstrap pending out of ready even before local documents are confirmed', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview(
        {
          sourceCount: 0,
          indexedSourceCount: 0,
          indexingSourceCount: 0,
          attentionSourceCount: 0,
        },
        {
          pending: true,
          hasLocalDocuments: false,
        }
      ),
      loading: false,
      attentionItems: [],
      indexingItems: [],
    });

    expect(summary.state).toBe('SCANNING');
  });

  it('returns scanning while server-side projection backlog is still pending', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview(
        {
          sourceCount: 0,
          indexedSourceCount: 0,
          indexingSourceCount: 0,
          attentionSourceCount: 0,
        },
        {
          pending: false,
          hasLocalDocuments: true,
        },
        {
          pending: true,
          unresolvedEventCount: 2,
        }
      ),
      loading: false,
      attentionItems: [],
      indexingItems: [],
    });

    expect(summary.state).toBe('SCANNING');
  });

  it('keeps projection backlog out of ready even after source counts appear', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview(
        {
          sourceCount: 4,
          indexedSourceCount: 4,
          indexingSourceCount: 0,
          attentionSourceCount: 0,
        },
        {
          pending: false,
          hasLocalDocuments: true,
        },
        {
          pending: true,
          unresolvedEventCount: 1,
        }
      ),
      loading: false,
      attentionItems: [],
      indexingItems: [],
    });

    expect(summary.state).toBe('SCANNING');
  });

  it('prioritizes attention over indexing', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview({
        indexingSourceCount: 2,
        attentionSourceCount: 1,
      }),
      loading: false,
      attentionItems: [attentionItem],
      indexingItems: [indexingItem],
    });

    expect(summary.state).toBe('NEEDS_ATTENTION');
    expect(summary.attentionSourceCount).toBe(1);
    expect(summary.indexingSourceCount).toBe(2);
  });

  it('treats quiet skip as ready when there are no attention or indexing items', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview({
        sourceCount: 0,
        indexedSourceCount: 0,
        indexingSourceCount: 0,
        attentionSourceCount: 0,
      }),
      loading: false,
      attentionItems: [],
      indexingItems: [],
    });

    expect(summary.state).toBe('READY');
  });

  it('uses file status lists when they are ahead of overview counts', () => {
    const summary = deriveKnowledgeSummary({
      overview: createOverview(),
      loading: false,
      attentionItems: [],
      indexingItems: [indexingItem],
    });

    expect(summary.state).toBe('INDEXING');
    expect(summary.indexingSourceCount).toBe(1);
  });
});
