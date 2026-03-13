import { Injectable } from '@nestjs/common';
import { MemoxClient } from '../memox';
import {
  AnyhuntExportCreateResponseSchema,
  AnyhuntExportGetResponseSchema,
  AnyhuntGraphEntityDetailSchema,
  AnyhuntGraphQueryResponseSchema,
  AnyhuntMemoryCreateResponseSchema,
  AnyhuntMemoryHistorySchema,
  AnyhuntMemoryListSchema,
  AnyhuntMemoryOverviewSchema,
  AnyhuntMemorySchema,
  AnyhuntMemoryUpdateResponseSchema,
  AnyhuntMemoryFeedbackResponseSchema,
  AnyhuntRetrievalSearchResponseSchema,
  type AnyhuntMemoryDto,
} from './dto/memory.dto';

type QueryPrimitive = string | number | boolean;
type QueryParams = Record<string, unknown>;
type GatewayPayload = Record<string, unknown>;
type IdempotentGatewayPayload = GatewayPayload & {
  idempotency_key: string;
};

const isQueryPrimitive = (value: unknown): value is QueryPrimitive =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const appendQueryValue = (
  query: URLSearchParams,
  key: string,
  value: unknown,
) => {
  if (value === undefined || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryValue(query, key, item);
    }
    return;
  }
  if (isQueryPrimitive(value)) {
    query.append(key, `${value}`);
    return;
  }
  if (typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendQueryValue(query, `${key}[${nestedKey}]`, nestedValue);
    }
    return;
  }
};

const toQueryString = (params: QueryParams): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    appendQueryValue(query, key, value);
  }
  const encoded = query.toString();
  return encoded.length > 0 ? `?${encoded}` : '';
};

@Injectable()
export class MemoryClient {
  constructor(private readonly memoxClient: MemoxClient) {}

  async getOverview(params: {
    userId: string;
    projectId: string;
  }): Promise<ReturnType<typeof AnyhuntMemoryOverviewSchema.parse>> {
    return this.memoxClient.requestJson({
      path: `/api/v1/memories/overview${toQueryString({
        user_id: params.userId,
        project_id: params.projectId,
      })}`,
      method: 'GET',
      schema: AnyhuntMemoryOverviewSchema,
    });
  }

  async searchRetrieval(params: {
    query: string;
    includeGraphContext: boolean;
    scope: {
      user_id: string;
      project_id: string;
      metadata?: Record<string, unknown>;
    };
    group_limits: {
      sources: number;
      memory_facts: number;
    };
  }) {
    return this.memoxClient.requestJson({
      path: '/api/v1/retrieval/search',
      method: 'POST',
      body: {
        query: params.query,
        include_graph_context: params.includeGraphContext,
        scope: params.scope,
        group_limits: params.group_limits,
      },
      schema: AnyhuntRetrievalSearchResponseSchema,
    });
  }

  async listMemories(params: QueryParams) {
    return this.memoxClient.requestJson({
      path: `/api/v1/memories${toQueryString(params)}`,
      method: 'GET',
      schema: AnyhuntMemoryListSchema,
    });
  }

  async getMemoryById(memoryId: string): Promise<AnyhuntMemoryDto> {
    return this.memoxClient.requestJson({
      path: `/api/v1/memories/${encodeURIComponent(memoryId)}`,
      method: 'GET',
      schema: AnyhuntMemorySchema,
    });
  }

  async createMemory(params: IdempotentGatewayPayload) {
    const { idempotency_key, ...body } = params;
    return this.memoxClient.requestJson({
      path: '/api/v1/memories',
      method: 'POST',
      body,
      idempotencyKey: String(idempotency_key),
      schema: AnyhuntMemoryCreateResponseSchema.transform(
        (value) => value.results,
      ),
    });
  }

  async updateMemory(memoryId: string, params: GatewayPayload) {
    return this.memoxClient.requestJson({
      path: `/api/v1/memories/${encodeURIComponent(memoryId)}`,
      method: 'PUT',
      body: params,
      schema: AnyhuntMemoryUpdateResponseSchema,
    });
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.memoxClient.requestVoid({
      path: `/api/v1/memories/${encodeURIComponent(memoryId)}`,
      method: 'DELETE',
    });
  }

  async batchUpdateMemories(params: GatewayPayload) {
    return this.memoxClient.requestJson({
      path: '/api/v1/batch',
      method: 'PUT',
      body: params,
      schema: zVoidRecordSchema,
    });
  }

  async batchDeleteMemories(params: GatewayPayload) {
    return this.memoxClient.requestJson({
      path: '/api/v1/batch',
      method: 'DELETE',
      body: params,
      schema: zVoidRecordSchema,
    });
  }

  async getMemoryHistory(memoryId: string) {
    return this.memoxClient.requestJson({
      path: `/api/v1/memories/${encodeURIComponent(memoryId)}/history`,
      method: 'GET',
      schema: AnyhuntMemoryHistorySchema,
    });
  }

  async feedbackMemory(params: GatewayPayload) {
    return this.memoxClient.requestJson({
      path: '/api/v1/feedback',
      method: 'POST',
      body: params,
      schema: AnyhuntMemoryFeedbackResponseSchema,
    });
  }

  async queryGraph(params: GatewayPayload) {
    return this.memoxClient.requestJson({
      path: '/api/v1/graph/query',
      method: 'POST',
      body: params,
      schema: AnyhuntGraphQueryResponseSchema,
    });
  }

  async getGraphEntityDetail(entityId: string, params: QueryParams) {
    const normalizedParams = {
      ...params,
      ...(params.metadata
        ? {
            metadata: JSON.stringify(params.metadata),
          }
        : {}),
    };
    return this.memoxClient.requestJson({
      path: `/api/v1/graph/entities/${encodeURIComponent(entityId)}${toQueryString(normalizedParams)}`,
      method: 'GET',
      schema: AnyhuntGraphEntityDetailSchema,
    });
  }

  async createExport(params: IdempotentGatewayPayload) {
    const { idempotency_key, ...body } = params;
    return this.memoxClient.requestJson({
      path: '/api/v1/exports',
      method: 'POST',
      body,
      idempotencyKey: String(idempotency_key),
      schema: AnyhuntExportCreateResponseSchema,
    });
  }

  async getExport(params: GatewayPayload) {
    return this.memoxClient.requestJson({
      path: '/api/v1/exports/get',
      method: 'POST',
      body: params,
      schema: AnyhuntExportGetResponseSchema,
    });
  }
}

const zVoidRecordSchema = {
  parse: (value: unknown) => value as Record<string, unknown>,
};
