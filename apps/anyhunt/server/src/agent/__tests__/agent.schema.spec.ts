import { describe, it, expect } from 'vitest';
import { CreateAgentTaskSchema } from '../dto';

describe('CreateAgentTaskSchema', () => {
  it('defaults output to text', () => {
    const parsed = CreateAgentTaskSchema.parse({
      prompt: 'hello',
      stream: false,
    });
    expect(parsed.output).toEqual({ type: 'text' });
  });

  it('accepts message-based input', () => {
    const parsed = CreateAgentTaskSchema.parse({
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
      ],
      stream: false,
    });
    expect(parsed.messages?.length).toBe(2);
  });

  it('rejects prompt and messages together', () => {
    const result = CreateAgentTaskSchema.safeParse({
      prompt: 'hello',
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing prompt and messages', () => {
    const result = CreateAgentTaskSchema.safeParse({
      stream: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects required keys not in properties', () => {
    const result = CreateAgentTaskSchema.safeParse({
      prompt: 'hello',
      stream: false,
      output: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { title: { type: 'string' } },
          required: ['missing'],
          additionalProperties: false,
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects too many properties', () => {
    const properties: Record<string, { type: 'string' }> = {};
    for (let i = 0; i < 51; i += 1) {
      properties[`field_${i}`] = { type: 'string' };
    }

    const result = CreateAgentTaskSchema.safeParse({
      prompt: 'hello',
      stream: false,
      output: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties,
          additionalProperties: false,
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects schemas that are too deep', () => {
    const result = CreateAgentTaskSchema.safeParse({
      prompt: 'hello',
      stream: false,
      output: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            a: {
              type: 'object',
              properties: {
                b: {
                  type: 'object',
                  properties: {
                    c: {
                      type: 'object',
                      properties: {
                        d: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          additionalProperties: false,
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects schemas that exceed max bytes', () => {
    const properties: Record<string, { type: 'string'; description: string }> =
      {};
    const description = 'x'.repeat(500);
    for (let i = 0; i < 50; i += 1) {
      properties[`field_${i}`] = { type: 'string', description };
    }

    const result = CreateAgentTaskSchema.safeParse({
      prompt: 'hello',
      stream: false,
      output: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties,
          additionalProperties: false,
        },
      },
    });

    expect(result.success).toBe(false);
  });
});
