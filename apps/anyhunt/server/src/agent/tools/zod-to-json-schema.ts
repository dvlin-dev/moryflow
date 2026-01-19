/**
 * Zod to JSON Schema Converter
 *
 * [PROVIDES]: 将 Zod schema 转换为 OpenAI function calling 兼容的 JSON schema
 * [DEPENDS]: zod (v4+)
 * [POS]: 消除 browser-tools.ts 中 Zod/JSON schema 的重复定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z, type ZodObject, type ZodRawShape } from 'zod';

export interface JsonObjectSchemaStrict {
  type: 'object';
  properties: Record<string, JsonPropertySchema>;
  required: string[];
  additionalProperties: false;
}

export interface JsonPropertySchema {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  [key: string]: unknown;
}

export function zodToJsonSchema<T extends ZodRawShape>(
  schema: ZodObject<T>,
): JsonObjectSchemaStrict {
  const jsonSchema = z.toJSONSchema(schema) as JsonObjectSchemaStrict;

  return {
    type: 'object',
    properties: jsonSchema.properties ?? {},
    required: jsonSchema.required ?? [],
    additionalProperties: false,
  };
}
