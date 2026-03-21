import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  assertExpectedStatus,
  assertExportCreatePayload,
  assertExportPayload,
  assertRetrievalSearchPayload,
  assertSourceSearchPayload,
  reviewOpenApiContract,
} from '../scripts/memox-phase2-openapi-load-check.utils';
import {
  ExportCreateResponseSchema,
  ExportGetResponseSchema,
} from '../src/memory/dto/memory.schema';
import { MemoryOverviewResponseSchema } from '../src/memory/dto';
import {
  GraphEntityDetailResponseSchema,
  GraphOverviewResponseSchema,
  GraphQueryResponseSchema,
} from '../src/graph/dto/graph.schema';
import {
  SearchRetrievalResponseSchema,
  SearchSourcesResponseSchema,
} from '../src/retrieval/dto/retrieval.schema';
import { SourceIdentityResponseSchema } from '../src/sources/dto';

function jsonResponse(schema: z.ZodTypeAny) {
  return {
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.toJSONSchema(schema),
          },
        },
      },
    },
  };
}

describe('memoxPhase2OpenapiLoadCheck utils', () => {
  it('flags forbidden paths, invalid success statuses, and invalid response schemas', () => {
    const result = reviewOpenApiContract({
      paths: {
        '/api/v1/source-identities/{sourceType}/{externalId}': {
          get: { responses: { 404: {} } },
          put: { responses: { 200: {} } },
        },
        '/api/v1/sources': { post: { responses: { 200: {} } } },
        '/api/v1/sources/{sourceId}/revisions': {
          post: { responses: { 201: {} } },
        },
        '/api/v1/source-revisions/{revisionId}/finalize': {
          post: { responses: { 201: {} } },
        },
        '/api/v1/source-revisions/{revisionId}/reindex': {
          post: { responses: { 200: {} } },
        },
        '/api/v1/sources/search': {
          post: jsonResponse(SearchRetrievalResponseSchema),
        },
        '/api/v1/retrieval/search': { post: { responses: { 201: {} } } },
        '/api/v1/exports': {
          post: jsonResponse(ExportGetResponseSchema),
        },
        '/api/v1/exports/get': { post: { responses: { 200: {} } } },
        '/api/v1/sources/{sourceId}/reindex': {},
      },
    });

    expect(result.missingPaths).toEqual([
      '/api/v1/memories/overview',
      '/api/v1/graph/overview',
      '/api/v1/graph/query',
      '/api/v1/graph/entities/{entityId}',
    ]);
    expect(result.missingOperations).toEqual([
      'GET /api/v1/memories/overview',
      'GET /api/v1/graph/overview',
      'POST /api/v1/graph/query',
      'GET /api/v1/graph/entities/{entityId}',
    ]);
    expect(result.forbiddenPresent).toEqual([
      '/api/v1/sources/{sourceId}/reindex',
    ]);
    expect(result.invalidSuccessStatuses).toEqual([
      'GET /api/v1/source-identities/{sourceType}/{externalId} -> expected documented success 200',
      'POST /api/v1/sources/{sourceId}/revisions -> expected documented success 200',
      'POST /api/v1/source-revisions/{revisionId}/finalize -> expected documented success 200',
      'POST /api/v1/retrieval/search -> expected documented success 200',
    ]);
    expect(result.invalidResponseSchemas).toEqual([
      'GET /api/v1/source-identities/{sourceType}/{externalId} -> missing documented application/json response schema',
      'PUT /api/v1/source-identities/{sourceType}/{externalId} -> missing documented application/json response schema',
      'POST /api/v1/sources/search -> response schema mismatch',
      'POST /api/v1/retrieval/search -> missing documented application/json response schema',
      'POST /api/v1/exports -> response schema mismatch',
      'POST /api/v1/exports/get -> missing documented application/json response schema',
    ]);
  });

  it('passes when documented response schemas match the frozen contracts', () => {
    const result = reviewOpenApiContract({
      paths: {
        '/api/v1/source-identities/{sourceType}/{externalId}': {
          get: jsonResponse(SourceIdentityResponseSchema),
          put: jsonResponse(SourceIdentityResponseSchema),
        },
        '/api/v1/sources': { post: { responses: { 200: {} } } },
        '/api/v1/sources/{sourceId}/revisions': {
          post: { responses: { 200: {} } },
        },
        '/api/v1/source-revisions/{revisionId}/finalize': {
          post: { responses: { 200: {} } },
        },
        '/api/v1/source-revisions/{revisionId}/reindex': {
          post: { responses: { 200: {} } },
        },
        '/api/v1/sources/search': {
          post: jsonResponse(SearchSourcesResponseSchema),
        },
        '/api/v1/memories/overview': {
          get: jsonResponse(MemoryOverviewResponseSchema),
        },
        '/api/v1/graph/overview': {
          get: jsonResponse(GraphOverviewResponseSchema),
        },
        '/api/v1/graph/query': {
          post: jsonResponse(GraphQueryResponseSchema),
        },
        '/api/v1/graph/entities/{entityId}': {
          get: jsonResponse(GraphEntityDetailResponseSchema),
        },
        '/api/v1/retrieval/search': {
          post: jsonResponse(SearchRetrievalResponseSchema),
        },
        '/api/v1/exports': { post: jsonResponse(ExportCreateResponseSchema) },
        '/api/v1/exports/get': { post: jsonResponse(ExportGetResponseSchema) },
      },
    });

    expect(result).toEqual({
      missingPaths: [],
      forbiddenPresent: [],
      missingOperations: [],
      invalidSuccessStatuses: [],
      invalidResponseSchemas: [],
    });
  });

  it('rejects unexpected runtime statuses', () => {
    expect(() => assertExpectedStatus('sources.search', 201, 200)).toThrow(
      'sources.search returned 201, expected 200',
    );
  });

  it('validates source and retrieval payload shapes', () => {
    expect(
      assertSourceSearchPayload(
        {
          results: [
            {
              result_kind: 'source',
              id: 'source-1',
              score: 1,
              rank: 1,
              source_id: 'source-1',
              source_type: 'note_markdown',
              project_id: 'project-1',
              external_id: 'file-1',
              display_path: 'notes/file-1.md',
              title: 'File 1',
              snippet: 'snippet',
              matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
              metadata: null,
            },
          ],
          total: 1,
        },
        'file-1',
      ).total,
    ).toBe(1);

    expect(
      assertRetrievalSearchPayload(
        {
          groups: {
            files: {
              items: [
                {
                  result_kind: 'source',
                  id: 'source-1',
                  score: 1,
                  rank: 1,
                  source_id: 'source-1',
                  source_type: 'note_markdown',
                  project_id: 'project-1',
                  external_id: 'file-1',
                  display_path: 'notes/file-1.md',
                  title: 'File 1',
                  snippet: 'snippet',
                  matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
                  metadata: null,
                },
              ],
              returned_count: 1,
              hasMore: false,
            },
            facts: {
              items: [],
              returned_count: 0,
              hasMore: false,
            },
          },
        },
        'file-1',
      ).groups.files.returned_count,
    ).toBe(1);
  });

  it('validates export create payload shape', () => {
    expect(
      assertExportCreatePayload({ memory_export_id: 'export-1' })
        .memory_export_id,
    ).toBe('export-1');
  });

  it('rejects invalid export payloads', () => {
    expect(() => assertExportPayload({ result: [] })).toThrow(
      'exports.get payload missing results[]',
    );
  });
});
