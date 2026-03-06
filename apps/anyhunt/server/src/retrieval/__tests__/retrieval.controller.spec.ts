import { describe, expect, it, vi } from 'vitest';
import { RetrievalController } from '../retrieval.controller';
import type { RetrievalService } from '../retrieval.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';
import type { CurrentUserDto } from '../../types';

describe('RetrievalController', () => {
  const apiKey = { id: 'api-key-1' } as ApiKeyValidationResult;
  const user = { id: 'user-1' } as CurrentUserDto;

  it('delegates sources search', async () => {
    const searchSources = vi.fn().mockResolvedValue({ results: [], total: 0 });
    const controller = new RetrievalController({
      searchSources,
      search: vi.fn(),
    } as unknown as RetrievalService);

    const result = await controller.searchSources(user, apiKey, {
      query: 'alpha',
      top_k: 10,
      include_graph_context: false,
      source_types: [],
    });

    expect(searchSources).toHaveBeenCalledWith('user-1', 'api-key-1', {
      query: 'alpha',
      top_k: 10,
      include_graph_context: false,
      source_types: [],
    });
    expect(result.total).toBe(0);
  });

  it('delegates unified retrieval search', async () => {
    const search = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = new RetrievalController({
      searchSources: vi.fn(),
      search,
    } as unknown as RetrievalService);

    const result = await controller.search(user, apiKey, {
      query: 'alpha',
      top_k: 10,
      include_graph_context: false,
      include_memory_facts: true,
      include_sources: true,
      source_types: [],
      categories: [],
    });

    expect(search).toHaveBeenCalledWith('user-1', 'api-key-1', {
      query: 'alpha',
      top_k: 10,
      include_graph_context: false,
      include_memory_facts: true,
      include_sources: true,
      source_types: [],
      categories: [],
    });
    expect(result.total).toBe(0);
  });
});
