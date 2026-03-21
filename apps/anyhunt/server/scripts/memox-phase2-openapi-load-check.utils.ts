import { zodSchemaToOpenApiSchema } from '../src/common';
import {
  ExportCreateResponseSchema,
  ExportGetResponseSchema,
  MemoryOverviewResponseSchema,
} from '../src/memory/dto/memory.schema';
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

export const REQUIRED_PATHS = [
  '/api/v1/source-identities/{sourceType}/{externalId}',
  '/api/v1/sources',
  '/api/v1/sources/{sourceId}/revisions',
  '/api/v1/source-revisions/{revisionId}/finalize',
  '/api/v1/source-revisions/{revisionId}/reindex',
  '/api/v1/sources/search',
  '/api/v1/memories/overview',
  '/api/v1/graph/overview',
  '/api/v1/graph/query',
  '/api/v1/graph/entities/{entityId}',
  '/api/v1/retrieval/search',
  '/api/v1/exports',
  '/api/v1/exports/get',
] as const;

export const FORBIDDEN_PATHS = ['/api/v1/sources/{sourceId}/reindex'] as const;

export const REQUIRED_OPENAPI_OPERATIONS = [
  {
    path: '/api/v1/source-identities/{sourceType}/{externalId}',
    method: 'get',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(SourceIdentityResponseSchema),
  },
  {
    path: '/api/v1/source-identities/{sourceType}/{externalId}',
    method: 'put',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(SourceIdentityResponseSchema),
  },
  {
    path: '/api/v1/sources',
    method: 'post',
    successStatus: 200,
  },
  {
    path: '/api/v1/sources/{sourceId}/revisions',
    method: 'post',
    successStatus: 200,
  },
  {
    path: '/api/v1/source-revisions/{revisionId}/finalize',
    method: 'post',
    successStatus: 200,
  },
  {
    path: '/api/v1/source-revisions/{revisionId}/reindex',
    method: 'post',
    successStatus: 200,
  },
  {
    path: '/api/v1/sources/search',
    method: 'post',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(SearchSourcesResponseSchema),
  },
  {
    path: '/api/v1/memories/overview',
    method: 'get',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(MemoryOverviewResponseSchema),
  },
  {
    path: '/api/v1/graph/overview',
    method: 'get',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(GraphOverviewResponseSchema),
  },
  {
    path: '/api/v1/graph/query',
    method: 'post',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(GraphQueryResponseSchema),
  },
  {
    path: '/api/v1/graph/entities/{entityId}',
    method: 'get',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(GraphEntityDetailResponseSchema),
  },
  {
    path: '/api/v1/retrieval/search',
    method: 'post',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(SearchRetrievalResponseSchema),
  },
  {
    path: '/api/v1/exports',
    method: 'post',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(ExportCreateResponseSchema),
  },
  {
    path: '/api/v1/exports/get',
    method: 'post',
    successStatus: 200,
    responseSchema: zodSchemaToOpenApiSchema(ExportGetResponseSchema),
  },
] as const;

type OpenApiDocument = {
  paths?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((entry) => normalizeSchema(entry));
  }

  if (!isRecord(schema)) {
    return schema;
  }

  const normalizedEntries = Object.entries(schema)
    .filter(([key]) => key !== '$schema')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, normalizeSchema(value)]);

  return Object.fromEntries(normalizedEntries);
}

function readDocumentedJsonResponseSchema(
  operation: Record<string, unknown>,
  successStatus: number,
): unknown | null {
  const responses = operation.responses;
  if (!isRecord(responses)) {
    return null;
  }

  const response = responses[String(successStatus)];
  if (!isRecord(response)) {
    return null;
  }

  const content = response.content;
  if (!isRecord(content)) {
    return null;
  }

  const jsonContent = content['application/json'];
  if (!isRecord(jsonContent)) {
    return null;
  }

  return jsonContent.schema ?? null;
}

export function reviewOpenApiContract(document: OpenApiDocument): {
  missingPaths: string[];
  forbiddenPresent: string[];
  missingOperations: string[];
  invalidSuccessStatuses: string[];
  invalidResponseSchemas: string[];
} {
  const paths = isRecord(document.paths) ? document.paths : {};
  const missingPaths = REQUIRED_PATHS.filter((path) => !(path in paths));
  const forbiddenPresent = FORBIDDEN_PATHS.filter((path) => path in paths);
  const missingOperations: string[] = [];
  const invalidSuccessStatuses: string[] = [];
  const invalidResponseSchemas: string[] = [];

  for (const operation of REQUIRED_OPENAPI_OPERATIONS) {
    const pathItem = paths[operation.path];
    if (!isRecord(pathItem) || !isRecord(pathItem[operation.method])) {
      missingOperations.push(
        `${operation.method.toUpperCase()} ${operation.path}`,
      );
      continue;
    }

    const documentedOperation = pathItem[operation.method] as Record<
      string,
      unknown
    >;
    const responses = documentedOperation.responses;
    if (
      !isRecord(responses) ||
      !(String(operation.successStatus) in responses)
    ) {
      invalidSuccessStatuses.push(
        `${operation.method.toUpperCase()} ${operation.path} -> expected documented success ${operation.successStatus}`,
      );
    }

    if (!('responseSchema' in operation)) {
      continue;
    }

    const documentedSchema = readDocumentedJsonResponseSchema(
      documentedOperation,
      operation.successStatus,
    );
    if (!documentedSchema) {
      invalidResponseSchemas.push(
        `${operation.method.toUpperCase()} ${operation.path} -> missing documented application/json response schema`,
      );
      continue;
    }

    if (
      JSON.stringify(normalizeSchema(documentedSchema)) !==
      JSON.stringify(normalizeSchema(operation.responseSchema))
    ) {
      invalidResponseSchemas.push(
        `${operation.method.toUpperCase()} ${operation.path} -> response schema mismatch`,
      );
    }
  }

  return {
    missingPaths,
    forbiddenPresent,
    missingOperations,
    invalidSuccessStatuses,
    invalidResponseSchemas,
  };
}

export function assertExpectedStatus(
  operation: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    throw new Error(`${operation} returned ${actual}, expected ${expected}`);
  }
}

export function assertSourceSearchPayload(
  payload: unknown,
  externalId: string,
) {
  const parsed = SearchSourcesResponseSchema.parse(payload);
  const hit = parsed.results.some((item) => item.external_id === externalId);
  if (!hit) {
    throw new Error(`sources.search miss for ${externalId}`);
  }
  return parsed;
}

export function assertRetrievalSearchPayload(
  payload: unknown,
  externalId: string,
) {
  const parsed = SearchRetrievalResponseSchema.parse(payload);
  const hit = parsed.groups.files.items.some(
    (item) => item.external_id === externalId,
  );
  if (!hit) {
    throw new Error(`retrieval.search miss for ${externalId}`);
  }
  return parsed;
}

export function assertExportCreatePayload(payload: unknown) {
  try {
    return ExportCreateResponseSchema.parse(payload);
  } catch {
    throw new Error('exports.create payload missing memory_export_id');
  }
}

export function assertExportPayload(payload: unknown) {
  try {
    return ExportGetResponseSchema.parse(payload);
  } catch {
    throw new Error('exports.get payload missing results[]');
  }
}
