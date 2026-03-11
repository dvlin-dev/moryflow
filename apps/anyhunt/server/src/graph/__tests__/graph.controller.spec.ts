import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it, vi } from 'vitest';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';
import { GraphController } from '../graph.controller';
import type { GraphOverviewService } from '../graph-overview.service';
import type { GraphQueryService } from '../graph-query.service';

describe('GraphController', () => {
  const apiKey = { id: 'api-key-1' } as ApiKeyValidationResult;

  it('delegates overview, query and entity detail to graph services', async () => {
    const graphOverviewService = {
      getOverview: vi.fn().mockResolvedValue({
        entity_count: 0,
        relation_count: 0,
        observation_count: 0,
        projection_status: 'idle',
        last_projected_at: null,
      }),
    } as unknown as GraphOverviewService;
    const graphQueryService = {
      query: vi.fn().mockResolvedValue({
        entities: [],
        relations: [],
        evidence_summary: {
          observation_count: 0,
          source_count: 0,
          memory_fact_count: 0,
          latest_observed_at: null,
        },
      }),
      getEntityDetail: vi.fn().mockResolvedValue({
        entity: {
          id: 'entity-1',
          entity_type: 'person',
          canonical_name: 'Alice',
          aliases: [],
          metadata: null,
          last_seen_at: null,
          incoming_relations: [],
          outgoing_relations: [],
        },
        evidence_summary: {
          observation_count: 0,
          source_count: 0,
          memory_fact_count: 0,
          latest_observed_at: null,
        },
        recent_observations: [],
      }),
    } as unknown as GraphQueryService;
    const controller = new GraphController(
      graphOverviewService,
      graphQueryService,
    );

    await controller.getOverview(apiKey, { project_id: 'project-1' });
    await controller.query(apiKey, {
      query: 'alice',
      limit: 10,
      scope: { project_id: 'project-1' },
    });
    await controller.getEntityDetail(apiKey, 'entity-1', {
      project_id: 'project-1',
    });

    expect(graphOverviewService.getOverview).toHaveBeenCalledWith('api-key-1', {
      project_id: 'project-1',
    });
    expect(graphQueryService.query).toHaveBeenCalledWith('api-key-1', {
      query: 'alice',
      limit: 10,
      scope: { project_id: 'project-1' },
    });
    expect(graphQueryService.getEntityDetail).toHaveBeenCalledWith(
      'api-key-1',
      'entity-1',
      {
        project_id: 'project-1',
      },
    );
  });

  it('declares response schemas for all graph read endpoints', () => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      GraphController.prototype.getOverview,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;
    const queryResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      GraphController.prototype.query,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;
    const entityResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      GraphController.prototype.getEntityDetail,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;

    expect(responses['200']?.schema?.properties).toHaveProperty('entity_count');
    expect(responses['200']?.schema?.properties).toHaveProperty(
      'projection_status',
    );
    expect(queryResponses['200']?.schema?.properties).toHaveProperty(
      'entities',
    );
    expect(queryResponses['200']?.schema?.properties).toHaveProperty(
      'evidence_summary',
    );
    expect(entityResponses['200']?.schema?.properties).toHaveProperty('entity');
    expect(entityResponses['200']?.schema?.properties).toHaveProperty(
      'recent_observations',
    );
  });

  it('marks graph read endpoints as 200 OK', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        GraphController.prototype.getOverview,
      ),
    ).toBe(HttpStatus.OK);
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, GraphController.prototype.query),
    ).toBe(HttpStatus.OK);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        GraphController.prototype.getEntityDetail,
      ),
    ).toBe(HttpStatus.OK);
  });
});
