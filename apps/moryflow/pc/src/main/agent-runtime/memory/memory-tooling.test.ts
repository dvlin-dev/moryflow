/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { buildMemoryTooling } from './memory-tooling';
import type { MemoryToolDeps } from './memory-tools';
import type { KnowledgeToolDeps } from './knowledge-tools';

const memoryDeps: MemoryToolDeps = {
  getWorkspaceId: vi.fn(),
  api: {
    search: vi.fn(),
    createFact: vi.fn(),
    updateFact: vi.fn(),
    listFacts: vi.fn(),
    deleteFact: vi.fn(),
    batchDeleteFacts: vi.fn(),
    getOverview: vi.fn(),
    getFactDetail: vi.fn(),
    getFactHistory: vi.fn(),
    feedbackFact: vi.fn(),
    queryGraph: vi.fn(),
    getEntityDetail: vi.fn(),
    batchUpdateFacts: vi.fn(),
    createExport: vi.fn(),
    getExport: vi.fn(),
  } as any,
};

const knowledgeDeps: KnowledgeToolDeps = {
  ...memoryDeps,
  readWorkspaceFile: vi.fn(),
};

describe('buildMemoryTooling', () => {
  it('returns no memory tools or prompt when capability is disabled', () => {
    const result = buildMemoryTooling(
      {
        state: 'login_required',
        canRead: false,
        canWrite: false,
        canReadKnowledgeFile: false,
        workspaceId: null,
        vaultPath: null,
        profileKey: null,
      },
      memoryDeps,
      knowledgeDeps
    );

    expect(result.memoryTools).toHaveLength(0);
    expect(result.knowledgeTools).toHaveLength(0);
    expect(result.instructions).toBe('');
  });

  it('returns read-only tools and read-only prompt when only read capability is available', () => {
    const result = buildMemoryTooling(
      {
        state: 'enabled',
        canRead: true,
        canWrite: false,
        canReadKnowledgeFile: true,
        workspaceId: 'ws-1',
        vaultPath: '/vault',
        profileKey: null,
      },
      memoryDeps,
      knowledgeDeps
    );

    expect(result.memoryTools.map((tool) => tool.name)).toEqual(['memory_search']);
    expect(result.knowledgeTools.map((tool) => tool.name)).toEqual([
      'knowledge_search',
      'knowledge_read',
    ]);
    expect(result.instructions).toContain('memory_search');
    expect(result.instructions).toContain('knowledge_search');
    expect(result.instructions).not.toContain('memory_save');
    expect(result.instructions).not.toContain('memory_update');
  });

  it('returns full toolset when read and write capabilities are available', () => {
    const result = buildMemoryTooling(
      {
        state: 'enabled',
        canRead: true,
        canWrite: true,
        canReadKnowledgeFile: true,
        workspaceId: 'ws-1',
        vaultPath: '/vault',
        profileKey: 'user-1:workspace-1',
      },
      memoryDeps,
      knowledgeDeps
    );

    expect(result.memoryTools.map((tool) => tool.name)).toEqual([
      'memory_search',
      'memory_save',
      'memory_update',
    ]);
    expect(result.knowledgeTools.map((tool) => tool.name)).toEqual([
      'knowledge_search',
      'knowledge_read',
    ]);
    expect(result.instructions).toContain('memory_save');
    expect(result.instructions).toContain('memory_update');
    expect(result.instructions).toContain('knowledge_read');
  });
});
