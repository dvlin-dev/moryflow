import { describe, expect, it } from 'vitest';
import {
  GraphOverviewResponseSchema,
  GraphQuerySchema,
} from '../dto/graph.schema';

describe('Graph schemas', () => {
  it('requires project_id for graph queries', () => {
    expect(() =>
      GraphQuerySchema.parse({
        limit: 10,
        scope: {},
      }),
    ).toThrow();
  });

  it('accepts disabled and failed projection statuses', () => {
    expect(
      GraphOverviewResponseSchema.parse({
        entity_count: 0,
        relation_count: 0,
        observation_count: 0,
        projection_status: 'disabled',
        last_projected_at: null,
      }).projection_status,
    ).toBe('disabled');

    expect(
      GraphOverviewResponseSchema.parse({
        entity_count: 0,
        relation_count: 0,
        observation_count: 0,
        projection_status: 'failed',
        last_projected_at: null,
      }).projection_status,
    ).toBe('failed');
  });
});
