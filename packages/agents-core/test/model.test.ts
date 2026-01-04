import { describe, test, expect } from 'vitest';

import { SerializedTool } from '../src/model';

describe('model.ts', () => {
  test('has expected exports', () => {
    const tool: SerializedTool = {
      type: 'function',
      name: 'test',
      description: 'test',
      parameters: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
          bar: { type: 'number' },
        },
        required: ['foo'],
        additionalProperties: false,
      },
      strict: false,
    };
    expect(tool).toBeDefined();
    expect(tool.type).toEqual('function');
  });
});
