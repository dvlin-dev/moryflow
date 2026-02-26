/**
 * [PROVIDES]: Memox Playground 请求映射与 CodeExample 映射
 * [DEPENDS]: memox types, playground schemas
 * [POS]: Memox Playground 容器层与 API 请求层之间的映射适配
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type {
  CreateMemoryRequest,
  CreateMemoryResponse,
  Memory,
  SearchMemoryRequest,
} from './types';
import type { CreateMemoryFormValues, SearchMemoryFormValues } from './playground-schemas';

interface BuildRequestResult<T> {
  request?: T;
  error?: string;
}

function parseOptionalJson(value: string | undefined, errorMessage: string): BuildRequestResult<unknown> {
  const trimmed = value?.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return { request: JSON.parse(trimmed) };
  } catch {
    return { error: errorMessage };
  }
}

function parseOptionalStringList(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean);
}

function parseJsonOrRaw(value: string | undefined): unknown {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function buildCreateMemoryRequest(
  values: CreateMemoryFormValues
): BuildRequestResult<CreateMemoryRequest> {
  const metadataResult = parseOptionalJson(values.metadata, 'Metadata must be valid JSON');
  if (metadataResult.error) {
    return { error: metadataResult.error };
  }

  const customCategoriesResult = parseOptionalJson(
    values.custom_categories,
    'Custom categories must be valid JSON'
  );
  if (customCategoriesResult.error) {
    return { error: customCategoriesResult.error };
  }

  const request: CreateMemoryRequest = {
    messages: [{ role: 'user', content: values.message }],
    user_id: values.user_id,
    infer: values.infer,
    async_mode: values.async_mode,
    output_format: values.output_format,
    enable_graph: values.enable_graph,
  };

  if (values.agent_id) {
    request.agent_id = values.agent_id;
  }

  if (values.app_id) {
    request.app_id = values.app_id;
  }

  if (values.run_id) {
    request.run_id = values.run_id;
  }

  if (values.includes) {
    request.includes = values.includes;
  }

  if (values.excludes) {
    request.excludes = values.excludes;
  }

  if (values.custom_instructions) {
    request.custom_instructions = values.custom_instructions;
  }

  if (metadataResult.request) {
    request.metadata = metadataResult.request as Record<string, unknown>;
  }

  if (customCategoriesResult.request) {
    request.custom_categories = customCategoriesResult.request as Record<string, unknown>;
  }

  return { request };
}

export function buildSearchMemoryRequest(
  values: SearchMemoryFormValues
): BuildRequestResult<SearchMemoryRequest> {
  const metadataResult = parseOptionalJson(values.metadata, 'Metadata must be valid JSON');
  if (metadataResult.error) {
    return { error: metadataResult.error };
  }

  const filtersResult = parseOptionalJson(values.filters, 'Filters must be valid JSON');
  if (filtersResult.error) {
    return { error: filtersResult.error };
  }

  const categories = parseOptionalStringList(values.categories);

  const request: SearchMemoryRequest = {
    user_id: values.user_id,
    query: values.query,
    top_k: values.top_k,
    output_format: values.output_format,
    keyword_search: values.keyword_search,
    rerank: values.rerank,
    filter_memories: values.filter_memories,
    only_metadata_based_search: values.only_metadata_based_search,
  };

  if (values.threshold !== undefined) {
    request.threshold = values.threshold;
  }

  if (metadataResult.request) {
    request.metadata = metadataResult.request as Record<string, unknown>;
  }

  if (filtersResult.request !== undefined) {
    request.filters = filtersResult.request;
  }

  if (categories.length > 0) {
    request.categories = categories;
  }

  return { request };
}

export function buildCreateCodeExampleBody(values: CreateMemoryFormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {
    messages: [{ role: 'user', content: values.message }],
    user_id: values.user_id,
    infer: values.infer,
    async_mode: values.async_mode,
    output_format: values.output_format,
    enable_graph: values.enable_graph,
  };

  if (values.agent_id) {
    body.agent_id = values.agent_id;
  }

  if (values.app_id) {
    body.app_id = values.app_id;
  }

  if (values.run_id) {
    body.run_id = values.run_id;
  }

  if (values.metadata) {
    body.metadata = parseJsonOrRaw(values.metadata);
  }

  if (values.includes) {
    body.includes = values.includes;
  }

  if (values.excludes) {
    body.excludes = values.excludes;
  }

  if (values.custom_instructions) {
    body.custom_instructions = values.custom_instructions;
  }

  if (values.custom_categories) {
    body.custom_categories = parseJsonOrRaw(values.custom_categories);
  }

  return body;
}

export function buildSearchCodeExampleBody(values: SearchMemoryFormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {
    user_id: values.user_id,
    query: values.query,
    top_k: values.top_k,
    output_format: values.output_format,
    keyword_search: values.keyword_search,
    rerank: values.rerank,
    filter_memories: values.filter_memories,
    only_metadata_based_search: values.only_metadata_based_search,
  };

  if (values.threshold !== undefined) {
    body.threshold = values.threshold;
  }

  if (values.metadata) {
    body.metadata = parseJsonOrRaw(values.metadata);
  }

  if (values.filters) {
    body.filters = parseJsonOrRaw(values.filters);
  }

  if (values.categories) {
    body.categories = parseOptionalStringList(values.categories);
  }

  return body;
}

export function mapCreateMemoryResponseToMemory(result: CreateMemoryResponse): Memory | null {
  const createdMemory = Array.isArray(result.results) ? result.results[0] : undefined;
  const memoryContent = createdMemory?.data?.memory;

  if (!memoryContent) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: createdMemory.id,
    memory: memoryContent,
    created_at: now,
    updated_at: now,
  };
}
