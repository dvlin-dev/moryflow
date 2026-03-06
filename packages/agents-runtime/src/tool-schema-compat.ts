/**
 * [PROVIDES]: Tool JSON Schema 兼容修复（enum 缺失 type 自动补齐）
 * [DEPENDS]: @openai/agents-core
 * [POS]: 跨模型（尤其 Gemini）函数工具 schema 兼容层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FunctionTool, Tool } from '@openai/agents-core';

type JsonSchemaNode = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonSchemaNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const inferEnumValueType = (value: unknown): string | null => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number';
    case 'object':
      return 'object';
    default:
      return null;
  }
};

const inferTypeFromEnum = (enumValues: unknown[]): string | string[] | undefined => {
  const inferred = new Set<string>();
  for (const value of enumValues) {
    const type = inferEnumValueType(value);
    if (type) inferred.add(type);
  }
  if (inferred.has('number') && inferred.has('integer')) {
    inferred.delete('integer');
  }
  if (inferred.size === 0) return undefined;
  if (inferred.size === 1) return [...inferred][0];
  return [...inferred];
};

const hasSchemaType = (node: JsonSchemaNode): boolean => {
  const type = node.type;
  if (typeof type === 'string') return true;
  return Array.isArray(type) && type.every((item) => typeof item === 'string');
};

const normalizeEnumType = (node: JsonSchemaNode): JsonSchemaNode => {
  if (hasSchemaType(node)) return node;
  const enumValues = node.enum;
  if (!Array.isArray(enumValues) || enumValues.length === 0) return node;
  const inferredType = inferTypeFromEnum(enumValues);
  if (!inferredType) return node;
  return { ...node, type: inferredType };
};

const normalizeSchemaNode = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => normalizeSchemaNode(item));
  }
  if (!isRecord(node)) return node;
  const normalized: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    normalized[key] = normalizeSchemaNode(value);
  }
  return normalizeEnumType(normalized);
};

export const normalizeFunctionToolSchema = <Context>(
  tool: FunctionTool<Context>
): FunctionTool<Context> => {
  return {
    ...tool,
    parameters: normalizeSchemaNode(tool.parameters) as FunctionTool<Context>['parameters'],
  };
};

export const normalizeToolSchemasForInterop = <Context>(tools: Tool<Context>[]): Tool<Context>[] =>
  tools.map((tool) => (tool.type === 'function' ? normalizeFunctionToolSchema(tool) : tool));
