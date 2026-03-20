import { describe, expect, it } from 'vitest';
import {
  MemoryGraphQuerySchema,
  MemoryOverviewResponseSchema,
} from './dto/memory.dto';

describe('Moryflow memory DTO', () => {
  it('requires workspaceId for graph queries and allows disabled/failed statuses', () => {
    expect(() =>
      MemoryGraphQuerySchema.parse({
        limit: 10,
      }),
    ).toThrow();

    expect(
      MemoryOverviewResponseSchema.parse({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'project-1',
          syncVaultId: null,
        },
        indexing: {
          sourceCount: 0,
          indexedSourceCount: 0,
          pendingSourceCount: 0,
          failedSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 0,
          derivedCount: 0,
        },
        graph: {
          entityCount: 0,
          relationCount: 0,
          projectionStatus: 'disabled',
          lastProjectedAt: null,
        },
      }).graph.projectionStatus,
    ).toBe('disabled');

    expect(
      MemoryOverviewResponseSchema.parse({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'project-1',
          syncVaultId: null,
        },
        indexing: {
          sourceCount: 0,
          indexedSourceCount: 0,
          pendingSourceCount: 0,
          failedSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 0,
          derivedCount: 0,
        },
        graph: {
          entityCount: 0,
          relationCount: 0,
          projectionStatus: 'failed',
          lastProjectedAt: null,
        },
      }).graph.projectionStatus,
    ).toBe('failed');
  });
});
