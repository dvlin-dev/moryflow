import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
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
    const search = vi.fn().mockResolvedValue({
      groups: {
        files: { items: [], returned_count: 0, hasMore: false },
        facts: { items: [], returned_count: 0, hasMore: false },
      },
    });
    const controller = new RetrievalController({
      searchSources: vi.fn(),
      search,
    } as unknown as RetrievalService);

    const result = await controller.search(user, apiKey, {
      query: 'alpha',
      group_limits: {
        sources: 10,
        memory_facts: 10,
      },
      include_graph_context: false,
      scope: {
        project_id: 'project-1',
      },
      source_types: [],
      categories: [],
    });

    expect(search).toHaveBeenCalledWith('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 10,
        memory_facts: 10,
      },
      include_graph_context: false,
      scope: {
        project_id: 'project-1',
      },
      source_types: [],
      categories: [],
    });
    expect(result.groups.files.returned_count).toBe(0);
    expect(result.groups.facts.returned_count).toBe(0);
  });

  it('declares response schemas for both retrieval endpoints', () => {
    const sourceResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      RetrievalController.prototype.searchSources,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;
    const retrievalResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      RetrievalController.prototype.search,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;

    expect(sourceResponses['200']?.schema?.properties).toHaveProperty(
      'results',
    );
    expect(sourceResponses['200']?.schema?.properties).toHaveProperty('total');
    expect(retrievalResponses['200']?.schema?.properties).toHaveProperty(
      'groups',
    );
    expect(
      (
        retrievalResponses['200']?.schema?.properties?.groups as {
          properties?: Record<string, unknown>;
        }
      )?.properties,
    ).toHaveProperty('files');
    expect(
      (
        retrievalResponses['200']?.schema?.properties?.groups as {
          properties?: Record<string, unknown>;
        }
      )?.properties,
    ).toHaveProperty('facts');
  });

  it('marks query-style POST endpoints as 200 OK', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        RetrievalController.prototype.searchSources,
      ),
    ).toBe(HttpStatus.OK);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        RetrievalController.prototype.search,
      ),
    ).toBe(HttpStatus.OK);
  });
});
