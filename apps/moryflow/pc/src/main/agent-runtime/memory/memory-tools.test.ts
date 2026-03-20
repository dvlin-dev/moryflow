/* @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryTools, type MemoryToolDeps } from './memory-tools';
import type { FunctionTool } from '@openai/agents-core';

const mockApi = {
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
};

const mockGetWorkspaceId = vi.fn();

const deps: MemoryToolDeps = {
  getWorkspaceId: mockGetWorkspaceId,
  api: mockApi as any,
};

const makeRunContext = (chatId: string) => ({ context: { chatId, vaultRoot: '/tmp' } }) as any;

function findTool(name: string): FunctionTool<any> {
  const tools = createMemoryTools(deps);
  const found = tools.find((t) => t.name === name);
  if (!found) throw new Error(`Tool "${name}" not found`);
  return found as FunctionTool<any>;
}

async function invokeTool(name: string, input: Record<string, unknown>, chatId: string) {
  const t = findTool(name);
  return t.invoke(makeRunContext(chatId), JSON.stringify(input));
}

describe('createMemoryTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkspaceId.mockResolvedValue('ws-123');
  });

  describe('memory_search', () => {
    it('calls search API with correct workspaceId from chatId and returns filtered non-readOnly items', async () => {
      mockApi.search.mockResolvedValue({
        groups: {
          facts: {
            items: [
              { id: 'f1', text: 'Prefers TS', readOnly: false, score: 0.9, sourceId: null },
              { id: 'f2', text: 'System fact', readOnly: true, score: 0.8, sourceId: null },
              { id: 'f3', text: 'Uses Vim', readOnly: false, score: 0.7, sourceId: null },
            ],
          },
        },
      });

      const result = await invokeTool('memory_search', { query: 'preferences' }, 'chat-1');

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-1');
      expect(mockApi.search).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        query: 'preferences',
        limitPerGroup: 10,
      });

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsed.items).toEqual([
        { id: 'f1', text: 'Prefers TS', readOnly: false, score: 0.9 },
        { id: 'f3', text: 'Uses Vim', readOnly: false, score: 0.7 },
      ]);
    });

    it('returns error object on API failure without throwing', async () => {
      mockApi.search.mockRejectedValue(new Error('Network error'));

      const result = await invokeTool('memory_search', { query: 'test' }, 'chat-1');

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsed.error).toBe(
        'Memory service is currently unavailable. Proceed without memory context.'
      );
    });
  });

  describe('memory_save', () => {
    it('calls createFact with text, category, metadata.origin and correct workspaceId', async () => {
      mockApi.createFact.mockResolvedValue({ id: 'new-1' });

      const result = await invokeTool(
        'memory_save',
        { text: 'Prefers dark mode', category: 'preference' },
        'chat-2'
      );

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-2', true);
      expect(mockApi.createFact).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        text: 'Prefers dark mode',
        categories: ['preference'],
        metadata: { origin: 'agent_tool' },
      });

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsed).toEqual({ id: 'new-1', saved: true });
    });

    it('passes requireSession=true to getWorkspaceId', async () => {
      mockApi.createFact.mockResolvedValue({ id: 'new-2' });

      await invokeTool('memory_save', { text: 'test', category: 'context' }, 'chat-3');

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-3', true);
    });

    it('returns error object on failure', async () => {
      mockApi.createFact.mockRejectedValue(new Error('Server down'));

      const result = await invokeTool(
        'memory_save',
        { text: 'test', category: 'preference' },
        'chat-1'
      );

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsed.error).toBe('Failed to save memory. The conversation continues normally.');
    });
  });

  describe('memory_update', () => {
    it('calls updateFact with factId, text, and requireSession=true', async () => {
      mockApi.updateFact.mockResolvedValue({ id: 'f1' });

      const result = await invokeTool(
        'memory_update',
        { id: 'f1', text: 'Updated preference' },
        'chat-4'
      );

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-4', true);
      expect(mockApi.updateFact).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        factId: 'f1',
        text: 'Updated preference',
      });

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsed).toEqual({ id: 'f1', updated: true });
    });

    it('returns error object on failure', async () => {
      mockApi.updateFact.mockRejectedValue(new Error('Not found'));

      const result = await invokeTool('memory_update', { id: 'f1', text: 'Updated' }, 'chat-1');

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsed.error).toBe('Failed to update memory.');
    });
  });

  describe('workspace resolution', () => {
    it('memory_search passes chatId to getWorkspaceId without requireSession', async () => {
      mockApi.search.mockResolvedValue({ groups: { facts: { items: [] } } });

      await invokeTool('memory_search', { query: 'test' }, 'chat-resolve');

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-resolve');
    });

    it('memory_save passes chatId + requireSession=true to getWorkspaceId', async () => {
      mockApi.createFact.mockResolvedValue({ id: 'x' });

      await invokeTool('memory_save', { text: 'fact', category: 'profile' }, 'chat-resolve');

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-resolve', true);
    });

    it('memory_update passes chatId + requireSession=true to getWorkspaceId', async () => {
      mockApi.updateFact.mockResolvedValue({ id: 'x' });

      await invokeTool('memory_update', { id: 'f1', text: 'updated' }, 'chat-resolve');

      expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-resolve', true);
    });
  });
});
