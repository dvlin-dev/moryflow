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
  AnyhuntMemoryFeedbackResponseSchema,
  AnyhuntRetrievalSearchResponseSchema,
  type AnyhuntMemoryDto,
} from './dto/memory.dto';

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
  if (typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendQueryValue(query, `${key}[${nestedKey}]`, nestedValue);
    }
    return;
  }
  query.append(key, String(value));
};

const toQueryString = (params: Record<string, unknown>): string => {
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

  async listMemories(params: Record<string, unknown>) {
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

  async createMemory(params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: '/api/v1/memories',
      method: 'POST',
      body: params,
      idempotencyKey: String(params.idempotency_key),
      schema: AnyhuntMemoryCreateResponseSchema.transform(
        (value) => value.results,
      ),
    });
  }

  async updateMemory(memoryId: string, params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: `/api/v1/memories/${encodeURIComponent(memoryId)}`,
      method: 'PUT',
      body: params,
      schema: AnyhuntMemorySchema,
    });
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.memoxClient.requestJson({
      path: `/api/v1/memories/${encodeURIComponent(memoryId)}`,
      method: 'DELETE',
      schema: zVoidSchema,
    });
  }

  async batchUpdateMemories(params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: '/api/v1/batch',
      method: 'PUT',
      body: params,
      schema: zVoidRecordSchema,
    });
  }

  async batchDeleteMemories(params: Record<string, unknown>) {
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

  async feedbackMemory(params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: '/api/v1/feedback',
      method: 'POST',
      body: params,
      schema: AnyhuntMemoryFeedbackResponseSchema,
    });
  }

  async queryGraph(params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: '/api/v1/graph/query',
      method: 'POST',
      body: params,
      schema: AnyhuntGraphQueryResponseSchema,
    });
  }

  async getGraphEntityDetail(
    entityId: string,
    params: Record<string, unknown>,
  ) {
    return this.memoxClient.requestJson({
      path: `/api/v1/graph/entities/${encodeURIComponent(entityId)}${toQueryString(params)}`,
      method: 'GET',
      schema: AnyhuntGraphEntityDetailSchema,
    });
  }

  async createExport(params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: '/api/v1/exports',
      method: 'POST',
      body: params,
      idempotencyKey: String(params.idempotency_key),
      schema: AnyhuntExportCreateResponseSchema,
    });
  }

  async getExport(params: Record<string, unknown>) {
    return this.memoxClient.requestJson({
      path: '/api/v1/exports/get',
      method: 'POST',
      body: params,
      schema: AnyhuntExportGetResponseSchema,
    });
  }
}

const zVoidSchema = {
  parse: () => undefined,
};

const zVoidRecordSchema = {
  parse: (value: unknown) => value as Record<string, unknown>,
};
