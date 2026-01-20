/**
 * [PROVIDES]: parseSchemaJsonToAgentOutput()
 * [DEPENDS]: None
 * [POS]: 将 Playground 表单的 schemaJson 转换为 anyhunt-server 所需的 Agent `output`
 */

import type { AgentOutput, JsonSchemaProperty } from './types';

const ALLOWED_SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProperty(value: unknown): JsonSchemaProperty {
  if (typeof value === 'string') {
    if (!ALLOWED_SCALAR_TYPES.has(value)) {
      throw new Error(`Unsupported property type: ${value}`);
    }
    return { type: value as JsonSchemaProperty['type'] };
  }

  if (!isRecord(value)) {
    throw new Error('Invalid property schema (must be an object)');
  }

  const type = value.type;
  if (typeof type !== 'string' || !ALLOWED_SCALAR_TYPES.has(type)) {
    throw new Error('Invalid property schema: missing or invalid type');
  }

  return value as JsonSchemaProperty;
}

function normalizeProperties(value: unknown): Record<string, JsonSchemaProperty> {
  if (!isRecord(value)) {
    throw new Error('Schema must be a JSON object');
  }

  const properties: Record<string, JsonSchemaProperty> = {};
  for (const [key, raw] of Object.entries(value)) {
    properties[key] = normalizeProperty(raw);
  }
  return properties;
}

export function parseSchemaJsonToAgentOutput(schemaJson?: string): AgentOutput {
  const raw = schemaJson?.trim();
  if (!raw) {
    return { type: 'text' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Invalid JSON');
  }

  if (isRecord(parsed) && parsed.type === 'text') {
    return { type: 'text' };
  }

  if (isRecord(parsed) && parsed.type === 'json_schema' && isRecord(parsed.schema)) {
    return parsed as AgentOutput;
  }

  if (isRecord(parsed) && parsed.type === 'object' && isRecord(parsed.properties)) {
    const properties = normalizeProperties(parsed.properties);
    return {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties,
        required: Object.keys(properties),
        additionalProperties: parsed.additionalProperties === true,
      },
    };
  }

  const properties = normalizeProperties(parsed);
  return {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
  };
}
