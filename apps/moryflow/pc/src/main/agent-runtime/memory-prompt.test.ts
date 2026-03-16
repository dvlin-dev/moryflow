/* @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildMemoryPromptBlock, MEMORY_TOOL_INSTRUCTIONS } from './memory-prompt';
import type { MemoryToolDeps } from './memory-tools';

const mockApi = {
  listFacts: vi.fn(),
  search: vi.fn(),
  createFact: vi.fn(),
  updateFact: vi.fn(),
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
};

const mockGetWorkspaceId = vi.fn().mockResolvedValue('ws-123');

const deps: MemoryToolDeps = {
  getWorkspaceId: mockGetWorkspaceId,
  api: mockApi as any,
};

describe('buildMemoryPromptBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkspaceId.mockResolvedValue('ws-123');
  });

  it('returns formatted "About This User" block with bullet points when facts exist', async () => {
    mockApi.listFacts.mockResolvedValue({
      items: [
        { id: 'f1', text: 'Prefers TypeScript' },
        { id: 'f2', text: 'Works at Acme Corp' },
      ],
    });

    const result = await buildMemoryPromptBlock(deps);

    expect(result).toContain('## About This User');
    expect(result).toContain('- Prefers TypeScript');
    expect(result).toContain('- Works at Acme Corp');
    expect(result).toContain('Use this knowledge to personalize your responses.');
  });

  it('returns empty string when no manual facts exist', async () => {
    mockApi.listFacts.mockResolvedValue({ items: [] });

    const result = await buildMemoryPromptBlock(deps);

    expect(result).toBe('');
  });

  it('returns empty string when API throws (never blocks agent)', async () => {
    mockApi.listFacts.mockRejectedValue(new Error('Service unavailable'));

    const result = await buildMemoryPromptBlock(deps);

    expect(result).toBe('');
  });

  it('requests kind=manual with pageSize=30', async () => {
    mockApi.listFacts.mockResolvedValue({ items: [] });

    await buildMemoryPromptBlock(deps);

    expect(mockApi.listFacts).toHaveBeenCalledWith({
      workspaceId: 'ws-123',
      kind: 'manual',
      pageSize: 30,
    });
  });
});

describe('MEMORY_TOOL_INSTRUCTIONS', () => {
  it('is a non-empty string containing key tool names', () => {
    expect(typeof MEMORY_TOOL_INSTRUCTIONS).toBe('string');
    expect(MEMORY_TOOL_INSTRUCTIONS.length).toBeGreaterThan(0);
    expect(MEMORY_TOOL_INSTRUCTIONS).toContain('memory_save');
    expect(MEMORY_TOOL_INSTRUCTIONS).toContain('memory_search');
    expect(MEMORY_TOOL_INSTRUCTIONS).toContain('knowledge_search');
  });
});
