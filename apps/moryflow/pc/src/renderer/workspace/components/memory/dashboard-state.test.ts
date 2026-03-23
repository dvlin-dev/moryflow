import { describe, expect, it } from 'vitest';
import type { MemoryOverview } from '@shared/ipc';
import { shouldShowMemoryEmptyDashboard } from './dashboard-state';

const createOverview = (
  overrides?: Partial<MemoryOverview['bootstrap']>,
  projectionOverrides?: Partial<MemoryOverview['projection']>
): MemoryOverview => ({
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
    ...overrides,
  },
  projection: {
    pending: false,
    pendingEventCount: 0,
    ...projectionOverrides,
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
} as MemoryOverview);

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

  it('does not show the full empty dashboard while server projection backlog is pending', () => {
    expect(
      shouldShowMemoryEmptyDashboard({
        isDisabled: false,
        overview: createOverview(undefined, {
          pending: true,
          pendingEventCount: 2,
        }),
        overviewLoading: false,
        personalFactsCount: 0,
        graphEntityCount: 0,
        knowledgeState: 'READY',
      })
    ).toBe(false);
  });
});
