import { describe, expect, it } from 'vitest';
import { buildGraphQueryParams } from './graph-schemas';
import type { GraphFormValues } from './graph-schemas';

function createGraphFormValues(overrides: Partial<GraphFormValues> = {}): GraphFormValues {
  return {
    entityType: 'user',
    entityId: 'entity-1',
    limit: 200,
    ...overrides,
  };
}

describe('graph-schemas', () => {
  it('maps user entity type to user_id query', () => {
    const params = buildGraphQueryParams(
      createGraphFormValues({
        entityType: 'user',
        entityId: 'user-123',
        limit: 120,
      })
    );

    expect(params).toEqual({
      user_id: 'user-123',
      limit: 120,
    });
  });

  it('maps agent entity type to agent_id query', () => {
    const params = buildGraphQueryParams(
      createGraphFormValues({
        entityType: 'agent',
        entityId: 'agent-456',
      })
    );

    expect(params).toEqual({
      agent_id: 'agent-456',
      limit: 200,
    });
  });

  it('maps app entity type to app_id query', () => {
    const params = buildGraphQueryParams(
      createGraphFormValues({
        entityType: 'app',
        entityId: 'app-789',
      })
    );

    expect(params).toEqual({
      app_id: 'app-789',
      limit: 200,
    });
  });

  it('maps run entity type to run_id query', () => {
    const params = buildGraphQueryParams(
      createGraphFormValues({
        entityType: 'run',
        entityId: 'run-000',
      })
    );

    expect(params).toEqual({
      run_id: 'run-000',
      limit: 200,
    });
  });
});
