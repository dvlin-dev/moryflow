import { describe, expect, it } from 'vitest';
import { tool, type Tool } from '@openai/agents-core';
import { z } from 'zod';

import { normalizeToolSchemasForInterop } from '../tool-schema-compat';

describe('tool-schema-compat', () => {
  it('adds missing enum type recursively for zod-generated schemas', () => {
    const rawTool = tool({
      name: 'demo',
      description: 'demo tool',
      parameters: z.object({
        status: z.array(z.enum(['todo', 'done'])).optional(),
        mode: z.enum(['patch', 'replace']),
      }),
      execute: async () => ({ ok: true }),
    });

    const [normalized] = normalizeToolSchemasForInterop([rawTool]) as Tool[];
    if (normalized.type !== 'function') {
      throw new Error('expected_function_tool');
    }

    const schema = normalized.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const status = properties.status as Record<string, unknown>;
    const statusItems = status.items as Record<string, unknown>;
    const mode = properties.mode as Record<string, unknown>;

    expect(statusItems.type).toBe('string');
    expect(mode.type).toBe('string');
  });

  it('infers non-string enum types for plain json schema tools', () => {
    const rawTool = tool({
      name: 'typed_enum_demo',
      description: 'typed enum demo',
      parameters: {
        type: 'object',
        properties: {
          retries: { enum: [1, 2, 3] },
          allow: { enum: [true, false] },
        },
        required: ['retries', 'allow'],
        additionalProperties: false,
      },
      execute: async () => ({ ok: true }),
    });

    const [normalized] = normalizeToolSchemasForInterop([rawTool]) as Tool[];
    if (normalized.type !== 'function') {
      throw new Error('expected_function_tool');
    }

    const schema = normalized.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const retries = properties.retries as Record<string, unknown>;
    const allow = properties.allow as Record<string, unknown>;

    expect(retries.type).toBe('integer');
    expect(allow.type).toBe('boolean');
  });
});
