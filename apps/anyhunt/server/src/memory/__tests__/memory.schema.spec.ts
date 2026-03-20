import { describe, expect, it } from 'vitest';
import {
  CreateMemorySchema,
  MemoryOverviewResponseSchema,
} from '../dto/memory.schema';

describe('Memory schemas', () => {
  it('uses include_in_graph instead of enable_graph', () => {
    const explicit = CreateMemorySchema.parse({
      messages: [{ role: 'user', content: 'hello' }],
      project_id: 'project-1',
      include_in_graph: true,
    });
    const legacy = CreateMemorySchema.parse({
      messages: [{ role: 'user', content: 'hello' }],
      project_id: 'project-1',
      enable_graph: true,
    });

    expect(explicit.include_in_graph).toBe(true);
    expect(legacy.include_in_graph).toBe(false);
    expect(legacy).not.toHaveProperty('enable_graph');
  });

  it('accepts disabled and failed graph projection status in overview', () => {
    expect(
      MemoryOverviewResponseSchema.parse({
        indexing: {
          source_count: 0,
          indexed_source_count: 0,
          pending_source_count: 0,
          failed_source_count: 0,
          last_indexed_at: null,
        },
        facts: {
          manual_count: 0,
          derived_count: 0,
        },
        graph: {
          entity_count: 0,
          relation_count: 0,
          projection_status: 'disabled',
          last_projected_at: null,
        },
      }).graph.projection_status,
    ).toBe('disabled');

    expect(
      MemoryOverviewResponseSchema.parse({
        indexing: {
          source_count: 0,
          indexed_source_count: 0,
          pending_source_count: 0,
          failed_source_count: 0,
          last_indexed_at: null,
        },
        facts: {
          manual_count: 0,
          derived_count: 0,
        },
        graph: {
          entity_count: 0,
          relation_count: 0,
          projection_status: 'failed',
          last_projected_at: null,
        },
      }).graph.projection_status,
    ).toBe('failed');
  });
});
