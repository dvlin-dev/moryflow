import { describe, expect, it } from 'vitest';
import {
  buildCreateCodeExampleBody,
  buildCreateMemoryRequest,
  buildSearchCodeExampleBody,
  buildSearchMemoryRequest,
  mapCreateMemoryResponseToMemory,
} from './playground-request-mapper';
import type { CreateMemoryFormValues, SearchMemoryFormValues } from './playground-schemas';

function createMemoryFormValues(overrides: Partial<CreateMemoryFormValues> = {}): CreateMemoryFormValues {
  return {
    user_id: 'user-1',
    message: 'remember this message',
    agent_id: '',
    app_id: '',
    run_id: '',
    metadata: '',
    includes: '',
    excludes: '',
    custom_instructions: '',
    custom_categories: '',
    infer: true,
    async_mode: true,
    output_format: 'v1.1',
    enable_graph: false,
    ...overrides,
  };
}

function searchMemoryFormValues(overrides: Partial<SearchMemoryFormValues> = {}): SearchMemoryFormValues {
  return {
    user_id: 'user-1',
    query: 'find memory',
    top_k: 10,
    threshold: undefined,
    output_format: 'v1.1',
    keyword_search: false,
    rerank: false,
    filter_memories: false,
    only_metadata_based_search: false,
    metadata: '',
    filters: '',
    categories: '',
    ...overrides,
  };
}

describe('playground-request-mapper', () => {
  it('builds create memory request with parsed JSON fields', () => {
    const result = buildCreateMemoryRequest(
      createMemoryFormValues({
        metadata: '{"source":"playground"}',
        custom_categories: '{"topic":"test"}',
      })
    );

    expect(result.error).toBeUndefined();
    expect(result.request?.metadata).toEqual({ source: 'playground' });
    expect(result.request?.custom_categories).toEqual({ topic: 'test' });
  });

  it('returns validation error for invalid create metadata JSON', () => {
    const result = buildCreateMemoryRequest(
      createMemoryFormValues({
        metadata: '{invalid-json',
      })
    );

    expect(result.request).toBeUndefined();
    expect(result.error).toBe('Metadata must be valid JSON');
  });

  it('builds search memory request with parsed filters and categories', () => {
    const result = buildSearchMemoryRequest(
      searchMemoryFormValues({
        filters: '{"AND":[{"user_id":"user-1"}]}',
        categories: 'work, life',
      })
    );

    expect(result.error).toBeUndefined();
    expect(result.request?.filters).toEqual({ AND: [{ user_id: 'user-1' }] });
    expect(result.request?.categories).toEqual(['work', 'life']);
  });

  it('returns validation error for invalid search filters JSON', () => {
    const result = buildSearchMemoryRequest(
      searchMemoryFormValues({
        filters: '{invalid-json',
      })
    );

    expect(result.request).toBeUndefined();
    expect(result.error).toBe('Filters must be valid JSON');
  });

  it('builds code example body with fallback to raw string for invalid JSON', () => {
    const createBody = buildCreateCodeExampleBody(
      createMemoryFormValues({
        metadata: '{invalid-json',
      })
    );
    const searchBody = buildSearchCodeExampleBody(
      searchMemoryFormValues({
        filters: '{invalid-json',
      })
    );

    expect(createBody.metadata).toBe('{invalid-json');
    expect(searchBody.filters).toBe('{invalid-json');
  });

  it('maps create response to memory when payload contains created memory', () => {
    const mapped = mapCreateMemoryResponseToMemory({
      results: [
        {
          id: 'memory-id',
          data: { memory: 'created memory' },
          event: 'ADD',
        },
      ],
    });

    expect(mapped?.id).toBe('memory-id');
    expect(mapped?.memory).toBe('created memory');
  });

  it('returns null when create response has no memory payload', () => {
    const mapped = mapCreateMemoryResponseToMemory({
      results: [
        {
          id: 'memory-id',
          data: { memory: '' },
          event: 'ADD',
        },
      ],
    });

    expect(mapped).toBeNull();
  });
});
