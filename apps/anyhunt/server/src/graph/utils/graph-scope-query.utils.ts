import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { GraphScopeSchema, type GraphQueryInputDto } from '../dto/graph.schema';

const BRACKET_SEGMENT_PATTERN = /([^[\]]+)/g;
const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const createSafeRecord = (): Record<string, unknown> =>
  Object.create(null) as Record<string, unknown>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assignNestedValue = (
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
) => {
  let cursor: Record<string, unknown> = target;
  for (let index = 0; index < path.length; index += 1) {
    const key = path[index];
    if (!key || FORBIDDEN_PROTO_KEYS.has(key)) {
      return;
    }
    const isLeaf = index === path.length - 1;
    if (isLeaf) {
      cursor[key] = value;
      return;
    }
    const next = cursor[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = createSafeRecord();
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
};

const parseMetadataValue = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null || value === '') {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (isPlainRecord(parsed)) {
        return parsed;
      }
    } catch {
      throw new BadRequestException({
        code: 'GRAPH_SCOPE_METADATA_INVALID',
        message: 'metadata must be a valid JSON object',
      });
    }
    throw new BadRequestException({
      code: 'GRAPH_SCOPE_METADATA_INVALID',
      message: 'metadata must be a valid JSON object',
    });
  }
  if (isPlainRecord(value)) {
    return value;
  }
  throw new BadRequestException({
    code: 'GRAPH_SCOPE_METADATA_INVALID',
    message: 'metadata must be a valid JSON object',
  });
};

const normalizeScalar = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[value.length - 1] : undefined;
  }
  return value;
};

export const parseGraphScopeQuery = (
  query: Record<string, unknown>,
): GraphQueryInputDto['scope'] => {
  const normalized = createSafeRecord();
  const metadataFromBrackets = createSafeRecord();

  for (const [key, rawValue] of Object.entries(query)) {
    if (key === 'metadata') {
      normalized.metadata = parseMetadataValue(rawValue);
      continue;
    }

    if (key.startsWith('metadata[')) {
      const segments = Array.from(key.matchAll(BRACKET_SEGMENT_PATTERN)).map(
        (match) => match[1],
      );
      if (segments[0] !== 'metadata') {
        continue;
      }
      assignNestedValue(
        metadataFromBrackets,
        segments.slice(1),
        normalizeScalar(rawValue),
      );
      continue;
    }

    normalized[key] = normalizeScalar(rawValue);
  }

  if (Object.keys(metadataFromBrackets).length > 0) {
    normalized.metadata = isPlainRecord(normalized.metadata)
      ? {
          ...normalized.metadata,
          ...metadataFromBrackets,
        }
      : metadataFromBrackets;
  }

  try {
    return GraphScopeSchema.parse(normalized);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      throw new BadRequestException({
        code: 'GRAPH_SCOPE_INVALID',
        message: 'Validation failed',
        errors,
      });
    }
    throw error;
  }
};
