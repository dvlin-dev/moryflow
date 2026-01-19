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

/** OpenAI function calling 兼容的严格 JSON schema */
export interface JsonObjectSchemaStrict {
  type: 'object';
  properties: Record<string, JsonPropertySchema>;
  required: string[];
  additionalProperties: false;
}

/** JSON schema 属性定义 */
export interface JsonPropertySchema {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  [key: string]: unknown;
}

/**
 * 从 Zod schema 中提取 JSON schema
 *
 * 使用 Zod v4 原生 toJSONSchema 方法，支持所有 Zod 类型
 *
 * @param schema Zod object schema
 * @returns OpenAI function calling 兼容的 JSON schema
 */
export function zodToJsonSchema<T extends ZodRawShape>(
  schema: ZodObject<T>
): JsonObjectSchemaStrict {
  const jsonSchema = z.toJSONSchema(schema) as JsonObjectSchemaStrict;

  // Zod v4 默认已经返回 additionalProperties: false
  // 确保格式符合 OpenAI function calling 要求
  return {
    type: 'object',
    properties: jsonSchema.properties ?? {},
    required: jsonSchema.required ?? [],
    additionalProperties: false,
  };
}
