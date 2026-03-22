import { describe, expect, it } from 'vitest';
import type { MemoryOverview } from '@shared/ipc';
import { shouldShowMemoryEmptyDashboard } from './dashboard-state';

const createOverview = (): MemoryOverview => ({
  scope: {
    workspaceId: 'ws-1',
    workspaceName: 'Workspace',
    localPath: '/workspace',
    vaultId: null,
    projectId: 'proj-1',
  },
  binding: {
    loggedIn: true,
    bound: true,
  },
  bootstrap: {
    pending: false,
    hasLocalDocuments: false,
  },
  sync: {
    engineStatus: 'idle',
    lastSyncAt: null,
    storageUsedBytes: 0,
  },
  indexing: {
    sourceCount: 0,
    indexedSourceCount: 0,
    indexingSourceCount: 0,
    attentionSourceCount: 0,
    lastIndexedAt: null,
  },
  facts: {
    manualCount: 0,
    derivedCount: 0,
  },
  graph: {
    entityCount: 0,
    relationCount: 0,
    projectionStatus: 'idle',
    lastProjectedAt: null,
  },
});

describe('shouldShowMemoryEmptyDashboard', () => {
  it('does not show the full empty dashboard while knowledge bootstrap is scanning', () => {
    expect(
      shouldShowMemoryEmptyDashboard({
        isDisabled: false,
        overview: createOverview(),
        overviewLoading: false,
        personalFactsCount: 0,
        graphEntityCount: 0,
        knowledgeState: 'SCANNING',
      })
    ).toBe(false);
  });

  it('shows the full empty dashboard only when knowledge is ready and there is no content', () => {
    expect(
      shouldShowMemoryEmptyDashboard({
        isDisabled: false,
        overview: createOverview(),
        overviewLoading: false,
        personalFactsCount: 0,
        graphEntityCount: 0,
        knowledgeState: 'READY',
      })
    ).toBe(true);
  });
});
